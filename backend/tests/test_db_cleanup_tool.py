"""Tests for the reusable database cleanup tool.

All tests run against a throwaway PostgreSQL database created and dropped by
``tests.cleanup_tool_harness``. The application's real database is never
connected to, read from, or modified here.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from scripts import db_cleanup_tool as tool

# Fixtures live in a helper module so this project's shared tests/conftest.py
# stays untouched; importing them here registers them with pytest.
from cleanup_tool_harness import (  # noqa: F401
    ALEMBIC_VERSION,
    backup_dir,
    clear_except_tables,
    db_url,
    isolated_database,
    postgres_available,
    seed_database,
    seeded_db,
    snapshot_counts,
    test_db_name,
    truncate_all,
)

PROTECTED_NAMES = {"source_system", "location_master", "planning_resource", "asset_master"}
MIGRATION_NAMES = {"alembic_version"}
NEVER_DELETED = PROTECTED_NAMES | MIGRATION_NAMES


def run_tool(db_url, capsys, *argv, backup_dir: Path):
    """Invoke the tool's CLI and return ``(exit_code, stdout)``."""
    code = tool.main([*argv, "--backup-dir", str(backup_dir)])
    return code, capsys.readouterr().out


# --------------------------------------------------------------------------- #
# inspection
# --------------------------------------------------------------------------- #
def test_inspect_lists_tables_counts_foreign_keys_and_protected(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    code, out = run_tool(db_url, capsys, "--inspect", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    assert "APPLICATION TABLES" in out
    assert "FOREIGN KEYS" in out
    assert "PROTECTED TABLES" in out
    for name in PROTECTED_NAMES:
        assert f"public.{name}" in out
    assert "public.candidate_block_window" in out
    assert "public.alembic_version" in out
    assert "nothing was modified" in out
    # row counts are reported
    assert f"{counts['candidate_block_window']:,}" in out
    # dependency edges are described, not just counted
    assert "ON DELETE" in out
    assert snapshot_counts(db_url) == counts


def test_default_invocation_is_inspection_only(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    code, out = run_tool(db_url, capsys, backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    assert "inspection only" in out
    assert "nothing was modified" in out
    assert snapshot_counts(db_url) == counts


def test_inspect_never_deletes_curated_reference_data(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    run_tool(db_url, capsys, "--inspect", backup_dir=backup_dir)

    after = snapshot_counts(db_url)
    for name in PROTECTED_NAMES:
        assert after[name] == counts[name] > 0


# --------------------------------------------------------------------------- #
# dry run
# --------------------------------------------------------------------------- #
def test_dry_run_performs_no_deletion(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    code, out = run_tool(db_url, capsys, "--dry-run", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    assert "DRY RUN" in out
    assert "no data was modified" in out
    assert snapshot_counts(db_url) == counts


def test_dry_run_reports_exact_expected_row_deletions(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db
    cleanable = {
        table: n for table, n in counts.items() if table not in NEVER_DELETED
    }
    expected_total = sum(cleanable.values())

    _, out = run_tool(db_url, capsys, "--dry-run", backup_dir=backup_dir)

    assert f"{expected_total:,}" in out
    # every cleanable table is listed, no protected table is targeted
    for table in cleanable:
        assert f"DELETE FROM public.{table}" in out
    for name in PROTECTED_NAMES:
        assert f"DELETE FROM public.{name}" not in out


# --------------------------------------------------------------------------- #
# backup
# --------------------------------------------------------------------------- #
def test_backup_mode_creates_verified_backup_and_deletes_nothing(
    seeded_db, capsys, backup_dir
):
    db_url, counts = seeded_db

    code, out = run_tool(db_url, capsys, "--backup", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    assert "no data was deleted" in out
    assert snapshot_counts(db_url) == counts

    dumps = list(backup_dir.glob("*.dump"))
    assert len(dumps) == 1
    details = tool.verify_backup(dumps[0])
    assert details["size_bytes"] > 0
    assert details["table_data_entries"] > 0
    assert len(details["sha256"]) == 64


def test_backup_is_never_overwritten(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db

    run_tool(db_url, capsys, "--backup", backup_dir=backup_dir)
    first = list(backup_dir.glob("*.dump"))
    run_tool(db_url, capsys, "--backup", backup_dir=backup_dir)
    second = list(backup_dir.glob("*.dump"))

    assert len(first) == 1
    assert len(second) == 2, "a second backup must not overwrite the first"
    assert first[0].read_bytes() != b""


def test_unique_backup_path_never_clobbers_existing_file(tmp_path):
    target = tmp_path / "existing.dump"
    target.write_bytes(b"precious")

    chosen = tool._unique_path(tmp_path, "db_pre_cleanup_20260101_000000", ".dump")

    assert chosen != target
    assert not chosen.exists()
    assert target.read_bytes() == b"precious"


def test_verify_backup_rejects_missing_and_empty_files(tmp_path):
    with pytest.raises(tool.CleanupError):
        tool.verify_backup(tmp_path / "nope.dump")

    empty = tmp_path / "empty.dump"
    empty.write_bytes(b"")
    with pytest.raises(tool.CleanupError):
        tool.verify_backup(empty)


def test_backup_failure_prevents_execution(seeded_db, capsys, backup_dir, monkeypatch):
    db_url, counts = seeded_db
    real_finder = tool.find_pg_tool

    def no_pg_dump(name):
        return None if name == "pg_dump" else real_finder(name)

    monkeypatch.setattr(tool, "find_pg_tool", no_pg_dump)

    code, _ = run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)

    assert code == tool.EXIT_ERROR
    assert snapshot_counts(db_url) == counts, "nothing may be deleted without a backup"


# --------------------------------------------------------------------------- #
# dependency handling
# --------------------------------------------------------------------------- #
def test_delete_order_is_children_first_for_every_foreign_key(db_url):
    conn = tool.connect(db_url)
    try:
        plan = tool.build_plan(conn)
    finally:
        conn.close()

    position = {rel.qualified: i for i, rel in enumerate(plan.order)}
    checked = 0
    for fk in plan.foreign_keys:
        child, parent = fk.child.qualified, fk.parent.qualified
        if child == parent:
            continue  # self-references need no ordering; covered separately
        if child in position and parent in position:
            assert position[child] < position[parent], (
                f"{child} must be deleted before {parent}"
            )
            checked += 1
    assert checked > 0, "expected real foreign keys between cleanable tables"


def test_self_referencing_table_is_reported_and_ordered(db_url):
    conn = tool.connect(db_url)
    try:
        plan = tool.build_plan(conn)
    finally:
        conn.close()

    self_refs = {fk.child.qualified for fk in plan.self_referencing}
    assert "public.block_plan" in self_refs
    assert "public.block_plan" in {rel.qualified for rel in plan.order}


def test_cross_table_cycle_is_refused(monkeypatch, db_url):
    a = tool.Relation("public", "alpha")
    b = tool.Relation("public", "beta")
    cyclic = [
        tool.ForeignKey("fk_a", child=a, parent=b, on_delete="NO ACTION"),
        tool.ForeignKey("fk_b", child=b, parent=a, on_delete="NO ACTION"),
    ]

    with pytest.raises(tool.CleanupError, match="cycle"):
        tool.order_children_first([a, b], cyclic)


# --------------------------------------------------------------------------- #
# protected tables
# --------------------------------------------------------------------------- #
def test_protected_tables_are_untouched_after_execute(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    code, out = run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    after = snapshot_counts(db_url)
    for name in PROTECTED_NAMES:
        assert after[name] == counts[name], f"{name} must keep all {counts[name]} rows"
        assert f"public.{name}" in out


def test_alembic_bookkeeping_survives_execute(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    code, _ = run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    after = snapshot_counts(db_url)
    assert after["alembic_version"] == 1
    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT version_num FROM public.alembic_version")
            assert cur.fetchone()[0] == ALEMBIC_VERSION
    finally:
        conn.close()


def test_children_of_protected_parents_are_still_cleaned(seeded_db, capsys, backup_dir):
    """asset_parameter/defect_failure hang off the protected asset_master."""
    db_url, counts = seeded_db
    assert counts["asset_parameter"] > 0
    assert counts["defect_failure"] > 0

    code, _ = run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    after = snapshot_counts(db_url)
    assert after["asset_parameter"] == 0
    assert after["defect_failure"] == 0
    assert after["asset_master"] == counts["asset_master"]


def test_protection_requires_explicit_unprotect(db_url):
    conn = tool.connect(db_url)
    try:
        default_plan = tool.build_plan(conn)
    finally:
        conn.close()

    protected = {r.name for r in default_plan.protected}
    targets = {r.name for r in default_plan.targets}
    assert PROTECTED_NAMES <= protected
    assert not (PROTECTED_NAMES & targets), "protected tables must never be targets by default"
    assert "alembic_version" in protected


def test_unprotect_widens_the_target_set_only_when_asked(db_url):
    """source_system is a parent of two protected tables, so all three go together."""
    conn = tool.connect(db_url)
    try:
        widened = tool.build_plan(
            conn, unprotected=["source_system", "asset_master", "planning_resource"]
        )
    finally:
        conn.close()

    targets = {r.name for r in widened.targets}
    protected = {r.name for r in widened.protected}
    assert {"source_system", "asset_master", "planning_resource"} <= targets
    assert not ({"source_system", "asset_master", "planning_resource"} & protected)
    # the remaining curated table stays protected
    assert "location_master" in protected


def test_unprotecting_a_parent_of_a_protected_table_is_refused(db_url):
    """asset_master and planning_resource are children of source_system."""
    conn = tool.connect(db_url)
    try:
        with pytest.raises(tool.CleanupError, match="dangling"):
            tool.build_plan(conn, unprotected=["source_system"])
    finally:
        conn.close()


def test_migration_bookkeeping_can_never_be_unprotected(db_url):
    conn = tool.connect(db_url)
    try:
        with pytest.raises(tool.CleanupError, match="migration bookkeeping"):
            tool.build_plan(conn, unprotected=["alembic_version"])
    finally:
        conn.close()


def test_protected_table_with_cleanable_parent_is_refused():
    """A plan that would orphan protected rows must be rejected."""
    parent = tool.Relation("public", "parent_table")
    child = tool.Relation("public", "child_table")
    fks = [tool.ForeignKey("fk", child=child, parent=parent, on_delete="NO ACTION")]
    order, _ = tool.order_children_first([parent], fks)

    plan = tool.CleanupPlan(
        info=tool.DatabaseInfo("d", "u", "h", 5432, "v", False),
        relations=[parent, child],
        protected=[child],
        targets=[parent],
        order=order,
        foreign_keys=fks,
        self_referencing=[],
        outgoing={child.qualified: fks, parent.qualified: []},
        incoming={parent.qualified: fks, child.qualified: []},
    )

    with pytest.raises(tool.CleanupError, match="dangling"):
        tool.validate_plan(plan)


def test_unknown_protect_or_unprotect_name_is_rejected(db_url):
    conn = tool.connect(db_url)
    try:
        with pytest.raises(tool.CleanupError, match="unknown table"):
            tool.build_plan(conn, extra_protected=["does_not_exist"])
        with pytest.raises(tool.CleanupError, match="unknown table"):
            tool.build_plan(conn, unprotected=["does_not_exist"])
    finally:
        conn.close()


# --------------------------------------------------------------------------- #
# location master
# --------------------------------------------------------------------------- #
LOCATION = "location_master"
LOCATION_QUALIFIED = f"public.{LOCATION}"


def build_plan(db_url, **kwargs):
    conn = tool.connect(db_url)
    try:
        return tool.build_plan(conn, **kwargs)
    finally:
        conn.close()


def location_rows(db_url) -> dict[int, str]:
    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT id, station_code FROM {LOCATION_QUALIFIED} ORDER BY id")
            return dict(cur.fetchall())
    finally:
        conn.close()


def asset_locations(db_url) -> dict[int, object]:
    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, location_id FROM public.asset_master ORDER BY id")
            return dict(cur.fetchall())
    finally:
        conn.close()


def test_location_master_is_skipped_and_stays_protected_by_default(seeded_db, capsys, backup_dir):
    """Without the opt-in flag location_master is left completely alone."""
    db_url, counts = seeded_db
    before = location_rows(db_url)
    assert len(before) == 3

    code, out = run_tool(db_url, capsys, "--dry-run", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    assert f"DELETE FROM {LOCATION_QUALIFIED}" not in out
    plan = build_plan(db_url)
    assert plan.location_cleanup is None
    assert LOCATION in {r.name for r in plan.protected}
    assert LOCATION not in {r.name for r in plan.targets}

    assert run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)[0] == tool.EXIT_OK
    assert location_rows(db_url) == before
    assert snapshot_counts(db_url)[LOCATION] == counts[LOCATION]


def test_inspect_explains_why_location_master_is_skipped(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db

    code, out = run_tool(db_url, capsys, "--inspect", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    assert "LOCATION MASTER" in out
    assert "is protected" in out
    assert "ON DELETE SET NULL" in out
    assert "--clean-location-master" in out


def test_dry_run_lists_exact_location_rows_and_dependents(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db
    before = location_rows(db_url)
    plan = build_plan(db_url, clean_location_master=True)
    cleanup = plan.location_cleanup
    assert cleanup is not None
    assert len(cleanup.delete_ids) == 2
    assert len(cleanup.keep_ids) == 1

    code, out = run_tool(
        db_url, capsys, "--dry-run", "--clean-location-master", backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK
    assert "LOCATION MASTER CLEANUP" in out
    assert LOCATION_QUALIFIED in out
    for row_id in cleanup.delete_ids + cleanup.keep_ids:
        assert f"id={row_id}" in out, f"location {row_id} must be named in the report"
    # the dependent records behind each preserved location
    assert "asset_master" in out
    assert "foreign key" in out
    assert "ON DELETE SET NULL" in out
    assert "row(s), e.g. id" in out
    # and nothing was touched
    assert location_rows(db_url) == before


def test_location_cleanup_deletes_only_unreferenced_rows(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db
    plan = build_plan(db_url, clean_location_master=True)
    keep_ids = sorted(plan.location_cleanup.keep_ids)
    delete_ids = sorted(plan.location_cleanup.delete_ids)
    assets_before = asset_locations(db_url)

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", "--clean-location-master", backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK, out
    assert "RESULT: SUCCESS" in out
    assert sorted(location_rows(db_url)) == keep_ids
    assert not set(keep_ids) & set(delete_ids)
    # protected reference data keeps working, so no foreign key was nulled
    assert asset_locations(db_url) == assets_before
    assert "protected references  : unchanged" in out
    # everything else was still cleaned as usual
    after = snapshot_counts(db_url)
    for table, rows in counts.items():
        if table not in NEVER_DELETED and table != LOCATION:
            assert after[table] == 0, f"{table} should have been emptied"
    assert after["asset_master"] == counts["asset_master"]


def test_include_referenced_locations_needs_an_explicit_second_opt_in(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db
    before = location_rows(db_url)

    code, _ = run_tool(db_url, capsys, "--dry-run", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    assert location_rows(db_url) == before
    # the flag is refused on its own rather than silently ignored
    code, out = run_tool(
        db_url, capsys, "--dry-run", "--include-referenced-locations", backup_dir=backup_dir
    )
    assert code == tool.EXIT_ERROR
    assert snapshot_counts(db_url) == counts
    assert location_rows(db_url) == before


def test_include_referenced_locations_removes_all_and_reports_unlinking(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db
    plan = build_plan(db_url, clean_location_master=True, include_referenced_locations=True)
    assert plan.location_cleanup.keep_ids == []
    assert len(plan.location_cleanup.delete_ids) == 3
    assert plan.location_cleanup.nulled

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", "--clean-location-master",
        "--include-referenced-locations", backup_dir=backup_dir,
    )

    assert code == tool.EXIT_OK
    assert location_rows(db_url) == {}
    # protected rows survive; only their location link is dropped, by the
    # foreign key's own SET NULL rule
    assert snapshot_counts(db_url)["asset_master"] == counts["asset_master"]
    assert all(value is None for value in asset_locations(db_url).values())
    assert "unlinked as explicitly approved" in out
    assert "LOCATION MASTER RESULT" in out


def test_location_table_is_deleted_last(seeded_db):
    db_url, _ = seeded_db

    plan = build_plan(db_url, clean_location_master=True)

    assert plan.order[-1].qualified == LOCATION_QUALIFIED
    position = {rel.qualified: i for i, rel in enumerate(plan.order)}
    referencing = [fk for fk in plan.foreign_keys if fk.parent.qualified == LOCATION_QUALIFIED]
    assert referencing, "expected at least one foreign key pointing at location_master"
    for fk in referencing:
        if fk.child.qualified not in position:
            # the referencing table is protected and kept, so safety comes from
            # the row-level dependency analysis rather than from ordering
            assert fk.child.qualified in {rel.qualified for rel in plan.protected}
            continue
        assert position[fk.child.qualified] < position[LOCATION_QUALIFIED], (
            f"{fk.child.qualified} must be dealt with before {LOCATION_QUALIFIED}"
        )
    # and the rows we keep are exactly the ones protected data points at
    protected_children = {
        fk.child.qualified for fk in referencing
        if fk.child.qualified in {rel.qualified for rel in plan.protected}
    }
    assert protected_children, "expected a protected table to reference location_master"
    for child in protected_children:
        assert any(
            dep.table == child for deps in plan.location_cleanup.kept.values() for dep in deps
        )


def test_location_referenced_only_by_a_text_code_is_still_preserved(db_url):
    """planning_resource.location_code is plain text, not a foreign key."""
    plan = build_plan(db_url, clean_location_master=True)
    target = next(row for row in plan.location_cleanup.rows if row.id in plan.location_cleanup.delete_ids)
    code_value = target.codes[0]

    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE public.planning_resource SET location_code = %s "
                "WHERE id = (SELECT min(id) FROM public.planning_resource)",
                (code_value,),
            )
        conn.commit()
    finally:
        conn.close()

    plan = build_plan(db_url, clean_location_master=True)
    cleanup = plan.location_cleanup
    assert target.id in cleanup.keep_ids
    assert target.id not in cleanup.delete_ids
    reasons = [dep for dep in cleanup.kept[target.id] if dep.column == "location_code"]
    assert reasons and reasons[0].kind == "code"
    assert code_value in reasons[0].describe() or "planning_resource" in reasons[0].describe()


def test_zone_or_section_codes_do_not_pin_every_location(db_url):
    """Only station/line identity counts as a reference.

    All three fixture locations share zone NCR, so matching on a zone would mark
    all of them as in use and quietly turn the cleanup into a no-op.
    """
    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE public.planning_resource SET location_code = %s "
                "WHERE id = (SELECT min(id) FROM public.planning_resource)",
                ("NCR",),
            )
        conn.commit()
    finally:
        conn.close()

    plan = build_plan(db_url, clean_location_master=True)
    cleanup = plan.location_cleanup

    # a shared zone code must not add a dependency, so only the foreign key
    # keeps its location and the other two stay deletable
    assert len(cleanup.keep_ids) == 1
    assert len(cleanup.delete_ids) == 2
    assert all(dep.kind == "foreign key" for deps in cleanup.kept.values() for dep in deps)


def test_unprotecting_location_master_alone_points_at_the_new_option(db_url):
    conn = tool.connect(db_url)
    try:
        with pytest.raises(tool.CleanupError, match="--clean-location-master"):
            tool.build_plan(conn, unprotected=[LOCATION])
    finally:
        conn.close()


def test_location_cleanup_requires_confirmation(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db
    before = location_rows(db_url)

    code, out = run_tool(
        db_url, capsys, "--execute", "--clean-location-master", backup_dir=backup_dir
    )

    assert code == tool.EXIT_ABORTED
    assert "aborted" in out.lower()
    assert location_rows(db_url) == before
    assert snapshot_counts(db_url) == counts


def test_location_cleanup_requires_a_verified_backup(seeded_db, capsys, backup_dir, monkeypatch):
    db_url, counts = seeded_db
    before = location_rows(db_url)
    real_finder = tool.find_pg_tool

    def no_pg_dump(name):
        return None if name == "pg_dump" else real_finder(name)

    monkeypatch.setattr(tool, "find_pg_tool", no_pg_dump)

    code, _ = run_tool(
        db_url, capsys, "--execute", "--yes", "--clean-location-master", backup_dir=backup_dir
    )

    assert code == tool.EXIT_ERROR
    assert location_rows(db_url) == before
    assert snapshot_counts(db_url) == counts


def test_failed_location_deletion_rolls_back_everything(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db
    before = location_rows(db_url)

    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "CREATE OR REPLACE FUNCTION test_fail_location() RETURNS trigger "
                "LANGUAGE plpgsql AS $$ BEGIN "
                "  RAISE EXCEPTION 'simulated location delete failure'; "
                "END $$"
            )
            cur.execute(
                "CREATE TRIGGER trg_fail_location BEFORE DELETE ON public.location_master "
                "FOR EACH ROW EXECUTE FUNCTION test_fail_location()"
            )
        conn.commit()
    finally:
        conn.close()

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", "--clean-location-master", backup_dir=backup_dir
    )

    assert code == tool.EXIT_ERROR
    assert "rolled back" in out.lower()
    assert location_rows(db_url) == before, "location rows must be restored by the rollback"
    assert snapshot_counts(db_url) == counts

    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("DROP TRIGGER trg_fail_location ON public.location_master")
            cur.execute("DROP FUNCTION test_fail_location()")
        conn.commit()
    finally:
        conn.close()


def test_location_cleanup_preserves_structure_and_relationships(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db

    def structure():
        conn = tool.connect(db_url)
        try:
            with conn.cursor() as cur:
                inventory = tool.schema_inventory(cur)
                cur.execute(
                    "SELECT conname, contype, pg_get_constraintdef(oid) "
                    "FROM pg_constraint WHERE conrelid = 'public.location_master'::regclass "
                    "ORDER BY conname"
                )
                constraints = cur.fetchall()
                cur.execute(
                    "SELECT indexdef FROM pg_indexes WHERE tablename = 'location_master' "
                    "ORDER BY 1"
                )
                indexes = cur.fetchall()
                cur.execute(
                    "SELECT is_nullable, column_default FROM information_schema.columns "
                    "WHERE table_name = 'location_master' AND column_name = 'id'"
                )
                id_column = cur.fetchone()
        finally:
            conn.close()
        return inventory, constraints, indexes, id_column

    before = structure()
    assert before[1], "location_master should have constraints to preserve"
    assert before[2], "location_master should have indexes to preserve"
    assert any(kind == "p" for _n, kind, _d in before[1])
    assert before[3][0] == "NO" and "nextval" in (before[3][1] or "")

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", "--clean-location-master", backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK, out
    assert structure() == before, "table structure, keys, constraints and indexes must survive"
    assert "database objects      : unchanged" in out
    assert "schema signature      : identical" in out
    assert before[0]["foreign_keys"] == structure()[0]["foreign_keys"] > 0


def test_location_delete_uses_explicit_ids_and_never_cascades():
    source = _code_without_docstrings(Path(tool.__file__).read_text(encoding="utf-8"))
    start = source.index("def delete_location_rows")
    body = source[start: source.index("\ndef ", start + 10)]

    assert "ANY(%s)" in body, "locations must be deleted by explicit primary key"
    assert "CASCADE" not in body.upper()
    assert "TRUNCATE" not in body.upper()
    assert "session_replication_role" not in body


# --------------------------------------------------------------------------- #
# execute
# --------------------------------------------------------------------------- #
def test_execute_clears_cleanable_tables_and_reports(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db
    expected_total = sum(
        n for t, n in counts.items() if t not in NEVER_DELETED
    )

    code, out = run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    assert "RESULT: SUCCESS" in out
    assert f"{expected_total:,}" in out

    after = snapshot_counts(db_url)
    cleanable_empty = {t: n for t, n in after.items() if t not in NEVER_DELETED}
    assert cleanable_empty == {t: 0 for t in cleanable_empty}
    assert after["alembic_version"] == 1


def test_execute_creates_and_reports_a_backup_first(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db

    code, out = run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)

    assert code == tool.EXIT_OK
    dumps = list(backup_dir.glob("*.dump"))
    assert len(dumps) == 1
    assert str(dumps[0]) in out
    assert "BACKUP" in out
    assert tool.verify_backup(dumps[0])["table_data_entries"] > 0


def test_execute_requires_confirmation_when_not_interactive(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    code, out = run_tool(db_url, capsys, "--execute", backup_dir=backup_dir)

    assert code == tool.EXIT_ABORTED
    assert "aborted" in out.lower()
    assert snapshot_counts(db_url) == counts


def test_failed_deletion_rolls_back_every_table(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            # fail part-way through the delete order, after some tables were emptied
            cur.execute(
                "CREATE OR REPLACE FUNCTION test_fail_on_delete() RETURNS trigger "
                "LANGUAGE plpgsql AS $$ BEGIN "
                "  IF NEW.id > 0 THEN RAISE EXCEPTION 'simulated delete failure'; "
                "  END IF; RETURN NEW; END $$"
            )
            cur.execute(
                "CREATE TRIGGER trg_test_fail BEFORE DELETE ON public.planning_constraint "
                "FOR EACH ROW EXECUTE FUNCTION test_fail_on_delete()"
            )
        conn.commit()
    finally:
        conn.close()

    code, out = run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)

    assert code == tool.EXIT_ERROR
    assert "rolled back" in out.lower()
    assert "ERRORS" in out
    after = snapshot_counts(db_url)
    assert after == counts, "every table must be restored by the rollback"

    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("DROP TRIGGER trg_test_fail ON public.planning_constraint")
            cur.execute("DROP FUNCTION test_fail_on_delete()")
        conn.commit()
    finally:
        conn.close()


def test_execute_verifies_schema_is_unchanged(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db

    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            before = tool.schema_inventory(cur)
    finally:
        conn.close()

    code, out = run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)
    assert code == tool.EXIT_OK

    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            after = tool.schema_inventory(cur)
    finally:
        conn.close()

    assert before == after
    assert before["base_tables"] == after["base_tables"] > 0
    assert before["primary_keys"] == after["primary_keys"] > 0
    assert before["foreign_keys"] == after["foreign_keys"] > 0
    assert before["indexes"] == after["indexes"] > 0
    assert before["sequences"] == after["sequences"] > 0
    assert "database objects      : unchanged" in out
    assert "schema signature      : identical" in out


def test_execute_does_not_reset_sequences(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db

    # push sequences forward first so "not reset" is a real assertion
    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT setval('public.candidate_block_window_id_seq', 5000, true)")
            cur.execute("SELECT setval('public.asset_parameter_id_seq', 4242, true)")
        conn.commit()
        with conn.cursor() as cur:
            before = tool.sequence_state(cur)
    finally:
        conn.close()

    assert before["public.candidate_block_window_id_seq"] == (5000, True)

    assert run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)[0] == tool.EXIT_OK

    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            after = tool.sequence_state(cur)
    finally:
        conn.close()

    assert before == after
    assert after["public.candidate_block_window_id_seq"] == (5000, True)
    assert after["public.asset_parameter_id_seq"] == (4242, True)


def test_relationship_definitions_survive_execute(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db

    def fk_definitions() -> list[tuple]:
        conn = tool.connect(db_url)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT con.conname, con.confdeltype, con.confupdtype,
                           cn.nspname || '.' || c.relname AS child,
                           pn.nspname || '.' || p.relname AS parent
                    FROM pg_constraint con
                    JOIN pg_class c ON c.oid = con.conrelid
                    JOIN pg_namespace cn ON cn.oid = c.relnamespace
                    JOIN pg_class p ON p.oid = con.confrelid
                    JOIN pg_namespace pn ON pn.oid = p.relnamespace
                    WHERE con.contype = 'f'
                    ORDER BY con.conname
                    """
                )
                return cur.fetchall()
        finally:
            conn.close()

    before = fk_definitions()
    assert before

    assert run_tool(db_url, capsys, "--execute", "--yes", backup_dir=backup_dir)[0] == tool.EXIT_OK

    assert fk_definitions() == before


# --------------------------------------------------------------------------- #
# targeted cleanup (--only-tables)
# --------------------------------------------------------------------------- #
# The four tables that survive a full cleanup, in the order the tool empties them.
REMAINING = ("alembic_version", "asset_master", "planning_resource", "source_system")


def only_args(tables=REMAINING, migration: bool = False) -> list[str]:
    argv: list[str] = []
    for table in tables:
        argv += ["--only-tables", table]
    if migration:
        argv.append("--include-alembic-version")
    return argv


def cleaned_except(db_url, keep) -> None:
    """Reproduce 'the rest of the database has already been cleaned'."""
    conn = tool.connect(db_url)
    try:
        clear_except_tables(conn, set(keep))
    finally:
        conn.close()


def test_only_tables_targets_exactly_the_named_tables(db_url):
    plan = build_plan(db_url, only_tables=list(REMAINING), include_alembic_version=True)

    assert {rel.name for rel in plan.targets} == set(REMAINING)
    assert plan.targeted
    assert plan.protected
    assert not ({r.name for r in plan.targets} & {r.name for r in plan.protected})
    # every table that was normally cleanable is now protected
    assert "public.candidate_block_window" not in {r.qualified for r in plan.targets}
    assert "location_master" in {r.name for r in plan.protected}


def test_only_tables_orders_source_system_after_its_children(db_url):
    """source_system is the parent of asset_master and planning_resource."""
    plan = build_plan(db_url, only_tables=list(REMAINING), include_alembic_version=True)

    order = [rel.name for rel in plan.order]
    assert order.index("source_system") > order.index("asset_master")
    assert order.index("source_system") > order.index("planning_resource")
    assert order[-1] == "source_system"


def test_only_tables_dry_run_reports_counts_and_every_dependency(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)
    before = snapshot_counts(db_url)
    plan = build_plan(db_url, only_tables=list(REMAINING), include_alembic_version=True)
    touching = {
        fk.constraint
        for rel in plan.targets
        for fk in plan.incoming[rel.qualified] + plan.outgoing[rel.qualified]
    }
    assert touching, "the selected tables must have foreign keys to report"

    code, out = run_tool(
        db_url, capsys, "--dry-run", *only_args(migration=True), backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK
    assert "FOREIGN KEY DEPENDENCIES OF THE SELECTED TABLES" in out
    for table in REMAINING:
        assert f"DELETE FROM public.{table}" in out
        assert f"public.{table}  ({before[table]} rows)" in out
    # every foreign key touching a selected table is spelled out by name
    for constraint in touching:
        assert constraint in out
    assert "ON DELETE RESTRICT" in out
    # already-empty referencing tables are reported as harmless
    assert "already empty, does not block" in out
    # children emptied in the same run are reported as such, not as blockers
    assert "emptied earlier in this same run" in out
    assert "BLOCKS THIS RUN" not in out
    assert "no data was modified" in out
    # nothing was touched
    assert snapshot_counts(db_url) == before
    assert sum(before[t] for t in NEVER_DELETED) > 0


def test_only_tables_empties_exactly_the_named_tables(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db
    cleaned_except(db_url, REMAINING)
    before = snapshot_counts(db_url)
    assert sum(before[t] for t in NEVER_DELETED) > 0
    others = {t: n for t, n in before.items() if t not in NEVER_DELETED}
    assert set(others.values()) == {0}

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", *only_args(migration=True), backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK
    assert "RESULT: SUCCESS" in out
    after = snapshot_counts(db_url)
    for table in NEVER_DELETED:
        assert after[table] == 0, f"public.{table} must be empty"
    # no other table gained or lost a row
    assert {t: after[t] for t in others} == others


def test_targeted_cleanup_never_touches_location_master(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db
    cleaned_except(db_url, set(REMAINING) | {"location_master"})
    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO public.location_master (zone_code, division_code, section_code, "
                "station_code, station_name, line_code, line_name) "
                "VALUES ('Z', 'D', 'S', 'ST1', 'Station 1', 'L1', 'Line 1')"
            )
        conn.commit()
    finally:
        conn.close()
    baseline = location_rows(db_url)

    code, _ = run_tool(
        db_url, capsys, "--execute", "--yes", *only_args(migration=True), backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK
    assert location_rows(db_url) == baseline, "location_master was already cleaned; leave it alone"
    assert snapshot_counts(db_url)["location_master"] == len(baseline) > 0


def test_alembic_version_cannot_be_targeted_without_the_explicit_opt_in(db_url):
    with pytest.raises(tool.CleanupError, match="acknowledgement"):
        build_plan(db_url, only_tables=list(REMAINING))


def test_include_alembic_version_requires_only_tables(db_url):
    with pytest.raises(tool.CleanupError, match="only makes sense together with --only-tables"):
        build_plan(db_url, include_alembic_version=True)


def test_only_tables_rejects_location_master_and_unknown_names(db_url):
    with pytest.raises(tool.CleanupError, match="own row-level cleanup path"):
        build_plan(db_url, only_tables=["location_master"])
    with pytest.raises(tool.CleanupError, match="unknown table"):
        build_plan(db_url, only_tables=["not_a_table"])


def test_only_tables_cannot_be_combined_with_the_other_selection_flags(
    seeded_db, capsys, backup_dir
):
    db_url, counts = seeded_db

    for extra in (["--unprotect", "source_system"], ["--protect", "train"],
                  ["--clean-location-master"]):
        code, _ = run_tool(
            db_url, capsys, "--dry-run", *only_args(), *extra, backup_dir=backup_dir
        )
        assert code == tool.EXIT_ERROR
        assert snapshot_counts(db_url) == counts


def test_dry_run_warns_about_the_alembic_version_table_before_anything_runs(
    seeded_db, capsys, backup_dir
):
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)

    _, out = run_tool(
        db_url, capsys, "--dry-run", *only_args(migration=True), backup_dir=backup_dir
    )

    assert "ALEMBIC MIGRATION VERSION TABLE - WARNING" in out
    assert "public.alembic_version WILL be emptied" in out
    assert "No migration is run" in out
    assert "alembic upgrade head" in out
    assert tool.ALEMBIC_RECOVERY_HINT in out


def test_default_cleanup_still_reports_no_alembic_warning(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db

    _, out = run_tool(db_url, capsys, "--dry-run", backup_dir=backup_dir)

    assert "ALEMBIC MIGRATION VERSION TABLE" not in out


# --------------------------------------------------------------------------- #
# blocking foreign-key dependencies
# --------------------------------------------------------------------------- #
def test_populated_referencing_table_blocks_a_targeted_run(seeded_db, capsys, backup_dir):
    """asset_parameter keeps a row pointing at asset_master, so asset_master stays."""
    db_url, counts = seeded_db
    assert counts["asset_parameter"] > 0
    plan = build_plan(db_url, only_tables=["asset_master"])
    constraint = next(
        fk.constraint for fk in plan.incoming["public.asset_master"]
        if fk.child.qualified == "public.asset_parameter"
    )

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", "--only-tables", "asset_master",
        backup_dir=backup_dir,
    )

    assert code == tool.EXIT_ERROR
    assert "BLOCKING FOREIGN KEY DEPENDENCIES" in out
    # the exact referencing table and constraint are named
    assert "public.asset_parameter" in out
    assert constraint in out
    assert "not possible without modifying" in out
    # nothing was deleted and no backup was even taken
    assert snapshot_counts(db_url) == counts
    assert list(backup_dir.glob("*.dump")) == []


def test_blocking_dependency_is_visible_in_the_dry_run(seeded_db, capsys, backup_dir):
    db_url, counts = seeded_db

    code, out = run_tool(
        db_url, capsys, "--dry-run", "--only-tables", "asset_master", backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK or code == tool.EXIT_ERROR
    assert "BLOCKS THIS RUN" in out
    assert "public.asset_parameter" in out
    assert "RESULT: BLOCKED" in out
    assert snapshot_counts(db_url) == counts


def test_blockers_are_computed_from_real_row_counts(db_url):
    """A pure-function check of the blocker analysis, no database needed."""
    parent = tool.Relation("public", "parent_table")
    child = tool.Relation("public", "child_table")
    fk = tool.ForeignKey("fk_child_parent", child=child, parent=parent, on_delete="RESTRICT")
    incoming = {parent.qualified: [fk], child.qualified: []}

    assert tool.blocking_references([parent], incoming, {child.qualified: 5}) != []
    assert tool.blocking_references([parent], incoming, {child.qualified: 0}) == []
    # a child that is itself a target is emptied first, so it never blocks
    assert tool.blocking_references(
        [parent, child], {parent.qualified: [fk], child.qualified: []},
        {child.qualified: 5},
    ) == []


def test_blocker_check_is_repeated_inside_the_transaction(seeded_db, capsys, backup_dir):
    """Rows that appear after the plan was built still stop the delete."""
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)

    plan = build_plan(db_url, only_tables=list(REMAINING), include_alembic_version=True)
    assert plan.blockers == []

    # now repopulate the whole graph again, behind the tool's back
    conn = tool.connect(db_url)
    try:
        clear_except_tables(conn, {"alembic_version"})
        seed_database(conn)
    finally:
        conn.close()

    result = tool.ExecutionResult()
    conn = tool.connect(db_url)
    try:
        with pytest.raises(tool.CleanupError, match="refusing to delete"):
            tool.execute_cleanup(conn, plan, result)
    finally:
        conn.close()

    after = snapshot_counts(db_url)
    assert after["alembic_version"] == 1, "the rollback must restore the version row"
    assert after["asset_master"] == 1
    assert after["asset_parameter"] > 0


# --------------------------------------------------------------------------- #
# alembic bookkeeping after an explicit opt-in
# --------------------------------------------------------------------------- #
def test_alembic_table_and_its_schema_survive_being_emptied(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)

    def alembic_definition() -> list[tuple]:
        conn = tool.connect(db_url)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT a.attname, a.atttypid::regtype::text, a.attnotnull,
                           con.conname, pg_get_constraintdef(con.oid)
                    FROM pg_attribute a
                    JOIN pg_class c ON c.oid = a.attrelid
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    LEFT JOIN pg_constraint con
                      ON con.conrelid = c.oid AND con.contype = 'p'
                    WHERE n.nspname = 'public' AND c.relname = 'alembic_version'
                      AND a.attnum > 0 AND NOT a.attisdropped
                    ORDER BY a.attname
                    """
                )
                return cur.fetchall()
        finally:
            conn.close()

    before = alembic_definition()
    assert before

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", *only_args(migration=True), backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK
    assert alembic_definition() == before, "the table and its definition must be preserved"
    assert snapshot_counts(db_url)["alembic_version"] == 0
    assert "ALEMBIC MIGRATION VERSION TABLE - NOW EMPTY" in out
    assert "public.alembic_version is now empty" in out
    assert tool.ALEMBIC_RECOVERY_HINT in out
    assert "database objects      : unchanged" in out
    assert "schema signature      : identical" in out
    assert "schema-integrity      : VERIFIED" in out


def test_migration_scripts_are_never_touched(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)
    versions = Path(tool.PROJECT_ROOT) / "alembic" / "versions"
    before = {p.name: p.stat().st_mtime_ns for p in versions.glob("*.py")}

    run_tool(
        db_url, capsys, "--execute", "--yes", *only_args(migration=True), backup_dir=backup_dir
    )

    after = {p.name: p.stat().st_mtime_ns for p in versions.glob("*.py")}
    assert before and before == after


def test_targeted_cleanup_keeps_every_sequence_and_relationship(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)
    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            sequences = tool.sequence_state(cur)
            relationships = tool.discover_foreign_keys(cur)
    finally:
        conn.close()

    code, _ = run_tool(
        db_url, capsys, "--execute", "--yes", *only_args(migration=True), backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK
    conn = tool.connect(db_url)
    try:
        with conn.cursor() as cur:
            assert tool.sequence_state(cur) == sequences, "sequences must not be reset"
            assert tool.discover_foreign_keys(cur) == relationships, "relationships must survive"
    finally:
        conn.close()


def test_backup_is_created_and_verified_before_the_targeted_delete(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", *only_args(migration=True), backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK
    dumps = list(backup_dir.glob("*.dump"))
    assert len(dumps) == 1
    assert str(dumps[0]) in out
    assert "BACKUP" in out
    assert tool.verify_backup(dumps[0])["table_data_entries"] > 0


def test_targeted_cleanup_requires_confirmation_when_not_interactive(
    seeded_db, capsys, backup_dir
):
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)
    before = snapshot_counts(db_url)

    code, out = run_tool(
        db_url, capsys, "--execute", *only_args(migration=True), backup_dir=backup_dir
    )

    assert code == tool.EXIT_ABORTED
    assert "aborted" in out.lower()
    assert snapshot_counts(db_url) == before


def test_targeted_cleanup_reports_before_and_after_counts(seeded_db, capsys, backup_dir):
    db_url, _ = seeded_db
    cleaned_except(db_url, REMAINING)
    before = snapshot_counts(db_url)

    code, out = run_tool(
        db_url, capsys, "--execute", "--yes", *only_args(migration=True), backup_dir=backup_dir
    )

    assert code == tool.EXIT_OK
    total = sum(before[t] for t in REMAINING)
    assert f"rows deleted          : {total}" in out
    for table in REMAINING:
        pattern = rf"public\.{table}\s+{before[table]:,}\s+->\s+0 rows"
        assert re.search(pattern, out), f"before/after row counts missing for public.{table}"
    # a table that was not selected is not claimed as emptied
    assert not re.search(r"public\.location_master\s+\d+\s+->", out)


# --------------------------------------------------------------------------- #
# database guard rails
# --------------------------------------------------------------------------- #
def test_refuses_system_databases():
    for name in ("postgres", "template0", "template1", "pg_catalog"):
        info = tool.DatabaseInfo(name, "u", "h", 5432, "v", False)
        with pytest.raises(tool.CleanupError):
            tool.assert_cleanup_allowed(info)


def test_refuses_read_only_standby():
    info = tool.DatabaseInfo("app", "u", "h", 5432, "v", True)
    with pytest.raises(tool.CleanupError, match="replica"):
        tool.assert_cleanup_allowed(info)


def test_allows_the_application_database():
    info = tool.DatabaseInfo("sih_26027", "u", "h", 5432, "v", False)
    tool.assert_cleanup_allowed(info)


# --------------------------------------------------------------------------- #
# static guarantees
# --------------------------------------------------------------------------- #
def _code_without_docstrings(source: str) -> str:
    """Source with docstrings and comment-only lines removed.

    A naive 'line starts with a triple quote' toggle gets out of step with
    single-line docstrings, which open and close on the same line and would
    otherwise hide real code from the safety scan below.
    """
    code_lines: list[str] = []
    in_docstring = False
    for line in source.splitlines():
        stripped = line.strip()
        if in_docstring:
            if stripped.endswith('"""'):
                in_docstring = False
            continue
        if stripped.startswith('"""'):
            # a one-line docstring both opens and closes on the same line
            in_docstring = not (len(stripped) > 5 and stripped.endswith('"""'))
            continue
        if stripped.startswith("#"):
            continue
        code_lines.append(stripped)
    return "\n".join(code_lines)


def test_tool_source_contains_no_ddl_or_dangerous_sql():
    source = Path(tool.__file__).read_text(encoding="utf-8")
    code = _code_without_docstrings(source)

    forbidden = [
        r"\bDROP\s+(TABLE|SCHEMA|DATABASE|INDEX|CONSTRAINT|TYPE|FUNCTION|SEQUENCE)\b",
        r"\bTRUNCATE\b",
        r"\bALTER\s+TABLE\b",
        r"\bCREATE\s+(TABLE|SCHEMA|INDEX|UNIQUE)\b",
        r"session_replication_role",
        r"DISABLE\s+TRIGGER",
        r"ALTER\s+SEQUENCE.*RESTART",
        r"setval\(",
        r"\bON\s+DELETE\s+CASCADE\b",
    ]
    for pattern in forbidden:
        assert not re.search(pattern, code, re.IGNORECASE), f"forbidden pattern: {pattern}"

    assert "DELETE FROM" in code


def test_tool_only_uses_delete_statements_for_deletion():
    source = Path(tool.__file__).read_text(encoding="utf-8")
    match = re.search(r'SQL\("([^"]*(?:DELETE|TRUNCATE|DROP)[^"]*)"\)', source)
    assert match is not None
    assert match.group(1).strip().upper() == "DELETE FROM {}.{}"


def test_tool_reads_credentials_from_app_config():
    source = Path(tool.__file__).read_text(encoding="utf-8")
    assert "from app.core.config import settings" in source
    assert "return settings.database_url" in source
    # no literal credentials in the tool
    assert not re.search(r"password\s*=\s*[\"'][^\"']+[\"']", source, re.IGNORECASE)
