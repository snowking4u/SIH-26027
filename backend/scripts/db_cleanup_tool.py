"""Reusable, safe PostgreSQL data cleanup tool for RAILFLOW AI.

Deletes *application data only* so synthetic/demo datasets can be regenerated
from a clean slate, while leaving the database structure byte-for-byte intact.

Safety model
------------
* Inspection is the default. Nothing is deleted unless ``--execute`` is passed.
* Tables and foreign keys are discovered dynamically from ``pg_catalog``; no
  table list is hardcoded.
* Protected tables (curated reference/master data) are never deleted unless the
  operator explicitly unprotects them with ``--unprotect``.
* ``location_master`` is additionally handled by an opt-in, row-level path:
  ``--clean-location-master`` inspects every referencing table first, keeps the
  locations that other data still needs, deletes the table last, and never uses a
  cascading delete. ``--include-referenced-locations`` is a second, explicit
  opt-in for the locations that kept data still points at.
* ``--only-tables`` narrows a run to an explicit list of tables and protects
  everything else. It is the path for finishing off a specific set of tables
  after a broader cleanup has already emptied the rest.
* Every table kept by a targeted run is checked row by row: if a kept table
  still holds rows that reference a target, the run stops and names the exact
  referencing table and constraint instead of forcing the delete.
* ``DELETE`` statements only. No ``DROP``/``ALTER``/``CREATE``/``TRUNCATE``, no
  ``TRUNCATE ... CASCADE``, no disabled foreign-key checks, no sequence resets.
* All deletes run children-first inside a single transaction; any failure rolls
  the whole thing back and nothing is silently skipped.
* A timestamped ``pg_dump`` backup is created and verified before ``--execute``
  will do anything, and previous backups are never overwritten.
* The schema is fingerprinted before and after to prove it did not change.

Usage
-----
    python scripts/db_cleanup_tool.py                 # inspect (default)
    python scripts/db_cleanup_tool.py --dry-run       # show planned deletions
    python scripts/db_cleanup_tool.py --backup        # backup only
    python scripts/db_cleanup_tool.py --execute       # destructive, confirmed
    python scripts/db_cleanup_tool.py --dry-run --clean-location-master

    python scripts/db_cleanup_tool.py --dry-run --only-tables asset_master
    python scripts/db_cleanup_tool.py --execute --only-tables asset_master
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import subprocess
import sys
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PROJECT_ROOT.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import psycopg2
from psycopg2 import sql as pg_sql
from sqlalchemy.engine import make_url

from app.core.config import settings

# Curated reference / master data. Protected unless explicitly unprotected.
DEFAULT_PROTECTED_TABLES: tuple[str, ...] = (
    "source_system",
    "location_master",
    "planning_resource",
    "asset_master",
)

# The location/station master. It is a curated table by default, so it is skipped
# unless the operator asks for it with --clean-location-master.
LOCATION_TABLE = "location_master"

# Columns of ``LOCATION_TABLE`` that identify a location, in report order.
LOCATION_LABEL_COLUMNS: tuple[str, ...] = (
    "zone_code",
    "division_code",
    "section_code",
    "station_code",
    "station_name",
    "line_code",
    "line_name",
)

# Columns that identify one specific place. Soft-reference matching is
# deliberately limited to these: a zone, division or section describes a *group* of
# locations, so matching on it would mark every location in that group as in use and
# silently make the cleanup a no-op.
LOCATION_IDENTITY_COLUMNS: tuple[str, ...] = ("station_code", "line_code")

# Columns in *other* tables that commonly carry a location's code as plain text.
# There is no foreign key, so such a reference never blocks a delete, but it does
# leave an orphan code behind and is therefore reported.
LOCATION_REFERENCE_COLUMNS: tuple[str, ...] = ("station_code", "location_code")

# How many dependent row ids to list per dependency in the report.
DEPENDENCY_SAMPLE = 10

# Alembic bookkeeping. Always protected; cannot be unprotected.
MIGRATION_TABLES: tuple[str, ...] = ("alembic_version",)

# The Alembic bookkeeping table. Emptying it does not touch the schema, but it
# does destroy the record of which revision the database is at, so it needs its
# own explicit opt-in on top of --only-tables.
ALEMBIC_VERSION_TABLE = "alembic_version"

# How to put the migration version row back if the bookkeeping table is emptied.
ALEMBIC_RECOVERY_HINT = (
    "INSERT INTO public.alembic_version (version_num) VALUES ('<head-revision>');"
)

SYSTEM_SCHEMAS: frozenset[str] = frozenset({"information_schema"})
DEFAULT_BACKUP_DIRNAME = "backups"
BACKUP_PREFIX = "pre_cleanup"

EXIT_OK = 0
EXIT_ERROR = 1
EXIT_ABORTED = 2

ON_DELETE_ACTIONS = {
    "a": "NO ACTION",
    "r": "RESTRICT",
    "c": "CASCADE",
    "n": "SET NULL",
    "d": "SET DEFAULT",
}

# Lines pg_dump emits that legitimately change between two runs of the same
# database; excluded before hashing a schema-only dump.
_VOLATILE_DUMP_LINE_PREFIXES = ("\\restrict ", "\\unrestrict ", "-- Dumped from ", "-- Dumped by ")


class CleanupError(RuntimeError):
    """Raised when the cleanup cannot safely continue."""


# --------------------------------------------------------------------------- #
# connection
# --------------------------------------------------------------------------- #
def resolve_database_url() -> str:
    """Return the backend's configured database URL.

    Credentials always come from the application's own settings
    (``app.core.config`` -> ``backend/.env``); nothing is hardcoded here.
    """
    return settings.database_url


def _url_parts(url: str) -> dict:
    parsed = make_url(url)
    if not parsed.database:
        raise CleanupError("DATABASE_URL does not name a database; refusing to continue.")
    return {
        "user": parsed.username,
        "password": parsed.password or "",
        "host": parsed.host or "localhost",
        "port": parsed.port or 5432,
        "dbname": parsed.database,
    }


def connect(database_url: str | None = None):
    """Open a psycopg2 connection using the application's database config."""
    parts = _url_parts(database_url or resolve_database_url())
    return psycopg2.connect(
        host=parts["host"],
        port=parts["port"],
        user=parts["user"],
        password=parts["password"],
        dbname=parts["dbname"],
    )


@dataclass(frozen=True)
class DatabaseInfo:
    database: str
    user: str
    host: str
    port: int
    server_version: str
    in_recovery: bool

    def describe(self) -> str:
        return (
            f"database={self.database} user={self.user} "
            f"host={self.host}:{self.port} server={self.server_version}"
        )


def describe_database(conn) -> DatabaseInfo:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT current_database(), current_user, inet_server_addr()::text, "
            "inet_server_port(), version(), pg_is_in_recovery()"
        )
        db, user, addr, port, version, in_recovery = cur.fetchone()
    return DatabaseInfo(
        database=db,
        user=user,
        host=addr or "local socket",
        port=port,
        server_version=version.split(" on ")[0],
        in_recovery=bool(in_recovery),
    )


def assert_cleanup_allowed(info: DatabaseInfo) -> None:
    """Refuse to touch a database that must never be cleaned."""
    if info.database in {"postgres", "template0", "template1"}:
        raise CleanupError(
            f"refusing to clean system database {info.database!r}; "
            "this tool only cleans the application database."
        )
    if info.database.startswith("pg_"):
        raise CleanupError(f"refusing to clean PostgreSQL system database {info.database!r}.")
    if info.in_recovery:
        raise CleanupError(
            f"{info.database} is a standby/replica (pg_is_in_recovery=true); "
            "cleanup is not allowed on a replica."
        )


# --------------------------------------------------------------------------- #
# catalog discovery
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Relation:
    schema: str
    name: str

    @property
    def qualified(self) -> str:
        return f"{self.schema}.{self.name}"


@dataclass(frozen=True)
class ForeignKey:
    constraint: str
    child: Relation
    parent: Relation
    on_delete: str

    def describe(self) -> str:
        return (
            f"{self.child.qualified} -> {self.parent.qualified} "
            f"[{self.constraint}] ON DELETE {self.on_delete}"
        )


@dataclass(frozen=True)
class BlockingReference:
    """A kept table that still holds rows pointing at a table being emptied.

    Found by comparing the actual foreign keys against the actual row counts,
    so it is the authoritative answer to "can this table be emptied without
    touching anything else?". A blocking reference is never forced: the tool
    stops and names the referencing table and constraint instead.
    """

    target: Relation
    child: Relation
    foreign_key: ForeignKey
    rows: int

    def describe(self) -> str:
        return (
            f"{self.child.qualified} holds {self.rows:,} row(s) referencing "
            f"{self.target.qualified} via [{self.foreign_key.constraint}] "
            f"(ON DELETE {self.foreign_key.on_delete})"
        )


def _application_schemas(cur) -> list[str]:
    cur.execute(
        "SELECT nspname FROM pg_namespace "
        "WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema' ORDER BY 1"
    )
    return [r[0] for r in cur.fetchall()]


def discover_relations(cur) -> list[Relation]:
    """All base tables in non-system schemas.

    Partition children are excluded so deletes always go through the partitioned
    parent, and extension-owned relations are excluded so cleanup can never
    reach into an extension.
    """
    cur.execute(
        """
        SELECT n.nspname, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'p')
          AND NOT c.relispartition
          AND n.nspname NOT LIKE 'pg\\_%'
          AND n.nspname <> 'information_schema'
          AND NOT EXISTS (
              SELECT 1 FROM pg_depend d
              WHERE d.classid = 'pg_class'::regclass
                AND d.objid = c.oid
                AND d.deptype = 'e'
          )
        ORDER BY 1, 2
        """
    )
    return [Relation(r[0], r[1]) for r in cur.fetchall()]


def discover_foreign_keys(cur) -> list[ForeignKey]:
    cur.execute(
        """
        SELECT con.conname,
               cn.nspname, c.relname,
               pn.nspname, p.relname,
               con.confdeltype
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace cn ON cn.oid = c.relnamespace
        JOIN pg_class p ON p.oid = con.confrelid
        JOIN pg_namespace pn ON pn.oid = p.relnamespace
        WHERE con.contype = 'f'
          AND cn.nspname NOT LIKE 'pg\\_%' AND cn.nspname <> 'information_schema'
        ORDER BY 1
        """
    )
    return [
        ForeignKey(
            constraint=r[0],
            child=Relation(r[1], r[2]),
            parent=Relation(r[3], r[4]),
            on_delete=ON_DELETE_ACTIONS.get(r[5], r[5]),
        )
        for r in cur.fetchall()
    ]


@dataclass(frozen=True)
class LocationRow:
    """One ``location_master`` row, flattened for reporting."""

    id: int
    label: str
    codes: tuple[str, ...]


@dataclass(frozen=True)
class LocationDependency:
    """A record that depends on a location row."""

    table: str
    column: str
    kind: str  # "foreign key" or "code"
    on_delete: str
    row_count: int
    sample_ids: tuple[int, ...]
    codes: tuple[str, ...] = ()

    def describe(self) -> str:
        if self.kind == "foreign key":
            head = f"{self.table}.{self.column} [foreign key, ON DELETE {self.on_delete}]"
        else:
            codes = ", ".join(self.codes) if self.codes else "-"
            head = (
                f"{self.table}.{self.column} [text code {codes}, no foreign key]"
            )
        sample = ", ".join(str(i) for i in self.sample_ids)
        return f"{head}: {self.row_count:,} row(s), e.g. id {sample}"


@dataclass
class LocationCleanup:
    """Which ``location_master`` rows may be deleted, and why."""

    table: Relation
    rows: list[LocationRow]
    keep_ids: list[int]
    delete_ids: list[int]
    kept: dict[int, list[LocationDependency]] = field(default_factory=dict)
    nulled: dict[int, list[LocationDependency]] = field(default_factory=dict)
    include_referenced: bool = False
    deferred: bool = True

    @property
    def all_dependencies(self) -> dict[int, list[LocationDependency]]:
        merged: dict[int, list[LocationDependency]] = {}
        for source in (self.kept, self.nulled):
            for row_id, deps in source.items():
                merged.setdefault(row_id, []).extend(deps)
        return merged

    def label_for(self, row_id: int) -> str:
        for row in self.rows:
            if row.id == row_id:
                return row.label
        return f"id={row_id}"


def _primary_key_columns(cur, rel: Relation) -> list[str]:
    cur.execute(
        "SELECT array(SELECT a.attname FROM pg_attribute a "
        "WHERE a.attrelid = %s::regclass AND a.attnum = ANY(con.conkey) "
        "ORDER BY array_position(con.conkey, a.attnum)) "
        "FROM pg_constraint con WHERE con.conrelid = %s::regclass AND con.contype = 'p'",
        (rel.qualified, rel.qualified),
    )
    row = cur.fetchone()
    return list(row[0]) if row and row[0] else ["ctid"]


def _count_and_sample(
    cur,
    rel: Relation,
    columns: Sequence[str],
    value,
    limit: int = DEPENDENCY_SAMPLE,
    match_any: bool = False,
) -> tuple[int, tuple[int, ...]]:
    """How many rows of ``rel`` match on ``columns``, plus a few of their ids."""
    condition = pg_sql.SQL(" AND ").join(
        (
            pg_sql.SQL("{} = ANY(%s)").format(pg_sql.Identifier(c))
            if match_any
            else pg_sql.SQL("{} = %s").format(pg_sql.Identifier(c))
        )
        for c in columns
    )
    bound = tuple(list(value) if match_any else value for _ in columns)
    cur.execute(
        pg_sql.SQL("SELECT count(*) FROM {}.{} WHERE {}").format(
            pg_sql.Identifier(rel.schema), pg_sql.Identifier(rel.name), condition
        ),
        bound,
    )
    total = cur.fetchone()[0]
    if not total:
        return 0, ()

    pk = _primary_key_columns(cur, rel)
    cur.execute(
        pg_sql.SQL("SELECT {} FROM {}.{} WHERE {} ORDER BY {} LIMIT {}").format(
            pg_sql.SQL(", ").join(pg_sql.Identifier(c) for c in pk),
            pg_sql.Identifier(rel.schema),
            pg_sql.Identifier(rel.name),
            condition,
            pg_sql.SQL(", ").join(pg_sql.Identifier(c) for c in pk),
            pg_sql.Literal(limit),
        ),
        bound,
    )
    return total, tuple(r[0] for r in cur.fetchall())


def read_location_rows(cur, rel: Relation) -> tuple[list[LocationRow], dict[str, list[int]]]:
    """Read every location row plus an index of code value -> location ids."""
    cur.execute(
        "SELECT array(SELECT a.attname FROM pg_attribute a "
        "WHERE a.attrelid = %s::regclass AND a.attnum > 0 AND NOT a.attisdropped "
        "ORDER BY a.attnum)",
        (rel.qualified,),
    )
    columns = list(cur.fetchone()[0] or [])
    if "id" not in columns:
        raise CleanupError(f"{rel.qualified} has no id column; cannot plan location cleanup.")

    cur.execute(
        pg_sql.SQL("SELECT {} FROM {}.{} ORDER BY {}").format(
            pg_sql.SQL(", ").join(pg_sql.Identifier(c) for c in columns),
            pg_sql.Identifier(rel.schema),
            pg_sql.Identifier(rel.name),
            pg_sql.SQL("{}").format(pg_sql.Identifier("id")),
        )
    )
    records = cur.fetchall()
    id_pos = columns.index("id")

    rows: list[LocationRow] = []
    for record in records:
        data = dict(zip(columns, record))
        parts = [str(data[c]) for c in LOCATION_LABEL_COLUMNS if data.get(c) is not None]
        rows.append(
            LocationRow(
                id=data["id"],
                label=" / ".join(parts) if parts else f"id={data['id']}",
                codes=tuple(
                    str(data[c]) for c in LOCATION_IDENTITY_COLUMNS if data.get(c) is not None
                ),
            )
        )

    code_index: dict[str, list[int]] = {}
    for column in LOCATION_IDENTITY_COLUMNS:
        if column not in columns:
            continue
        position = columns.index(column)
        for record in records:
            value = record[position]
            if value is None:
                continue
            code_index.setdefault(str(value), []).append(record[id_pos])
    return rows, code_index


def location_inbound_foreign_keys(
    cur, rel: Relation
) -> list[tuple[str, Relation, list[str], str]]:
    """Foreign keys that point at ``rel``, with their child columns."""
    cur.execute(
        """
        SELECT con.conname, cn.nspname, c.relname, con.confdeltype,
               array(
                   SELECT a.attname FROM pg_attribute a
                   WHERE a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
                   ORDER BY array_position(con.conkey, a.attnum)
               )
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace cn ON cn.oid = c.relnamespace
        WHERE con.contype = 'f' AND con.confrelid = %s::regclass
        ORDER BY 1
        """,
        (rel.qualified,),
    )
    return [
        (
            name,
            Relation(schema, table),
            list(columns or []),
            ON_DELETE_ACTIONS.get(deltype, deltype),
        )
        for name, schema, table, deltype, columns in cur.fetchall()
    ]


def location_reference_columns(cur, relations: Sequence[Relation]) -> dict[str, list[str]]:
    """``qualified table name -> text columns that may hold a location code``."""
    wanted = {r.qualified for r in relations}
    cur.execute(
        """
        SELECT n.nspname || '.' || c.relname, a.attname
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE a.attnum > 0 AND NOT a.attisdropped
          AND c.relkind IN ('r', 'p')
          AND n.nspname NOT LIKE 'pg\\_%%' AND n.nspname <> 'information_schema'
          AND a.attname = ANY(%s)
        ORDER BY 1, 2
        """,
        (list(LOCATION_REFERENCE_COLUMNS),),
    )
    found: dict[str, list[str]] = {}
    for qualified, column in cur.fetchall():
        if qualified in wanted:
            found.setdefault(qualified, []).append(column)
    return found


def analyse_location_cleanup(
    cur,
    rel: Relation,
    kept_relations: Sequence[Relation],
    include_referenced: bool,
) -> LocationCleanup:
    """Decide which location rows can go without breaking kept data.

    A location row is preserved when any table that is *not* being cleaned
    still points at it - through a real foreign key, or through a plain text
    code. Deleting such a row would either violate the foreign key or leave
    protected reference data pointing at nothing, so it needs explicit approval
    via ``--include-referenced-locations``.
    """
    rows, code_index = read_location_rows(cur, rel)
    kept = {r.qualified for r in kept_relations}
    hard: dict[int, list[LocationDependency]] = {row.id: [] for row in rows}
    soft: dict[int, list[LocationDependency]] = {row.id: [] for row in rows}

    for _name, child, columns, on_delete in location_inbound_foreign_keys(cur, rel):
        if child.qualified not in kept:
            continue  # emptied earlier in the delete order
        if not columns:
            continue
        for row in rows:
            total, sample = _count_and_sample(cur, child, columns, row.id)
            if total:
                hard[row.id].append(
                    LocationDependency(
                        child.qualified, ",".join(columns), "foreign key", on_delete,
                        total, sample,
                    )
                )

    if code_index:
        for qualified, columns in location_reference_columns(cur, kept_relations).items():
            child = Relation(*qualified.split(".", 1))
            if child.qualified == rel.qualified:
                continue
            for column in columns:
                # One dependency per column rather than per matching code, so a
                # location that happens to share a code with another is not
                # reported twice.
                codes_used: list[str] = []
                matched: list[list[int]] = []
                for code, location_ids in code_index.items():
                    found, _ = _count_and_sample(cur, child, [column], code)
                    if found:
                        codes_used.append(code)
                        matched.append(location_ids)
                if not codes_used:
                    continue
                total, sample = _count_and_sample(
                    cur, child, [column], codes_used, match_any=True
                )
                dependency = LocationDependency(
                    child.qualified, column, "code", "n/a", total, sample,
                    tuple(sorted(codes_used)),
                )
                for location_ids in matched:
                    for location_id in location_ids:
                        soft[location_id].append(dependency)

    referenced = {i for i in hard if hard[i]} | {i for i in soft if soft[i]}
    if include_referenced:
        cleanup = LocationCleanup(
            table=rel,
            rows=rows,
            keep_ids=[],
            delete_ids=[row.id for row in rows],
            nulled={i: hard[i] + soft[i] for i in sorted(referenced)},
            include_referenced=True,
        )
    else:
        cleanup = LocationCleanup(
            table=rel,
            rows=rows,
            keep_ids=sorted(referenced),
            delete_ids=[row.id for row in rows if row.id not in referenced],
            kept={i: hard[i] + soft[i] for i in sorted(referenced)},
        )
    return cleanup


def location_reference_snapshot(
    cur, cleanup: LocationCleanup, kept_relations: Sequence[Relation]
) -> dict[str, list[tuple]]:
    """Exact values of kept tables' location-referencing columns.

    Comparing this before and after proves that cleaning locations did not
    quietly unlink protected reference data.
    """
    kept = {r.qualified for r in kept_relations}
    snapshot: dict[str, list[tuple]] = {}
    for _name, child, columns, _on_delete in location_inbound_foreign_keys(cur, cleanup.table):
        if child.qualified not in kept or not columns:
            continue
        cur.execute(
            pg_sql.SQL("SELECT {} FROM {}.{} ORDER BY {}").format(
                pg_sql.SQL(", ").join(pg_sql.Identifier(c) for c in columns),
                pg_sql.Identifier(child.schema),
                pg_sql.Identifier(child.name),
                pg_sql.SQL(", ").join(pg_sql.Identifier(c) for c in columns),
            )
        )
        snapshot[f"{child.qualified}.{','.join(columns)}"] = cur.fetchall()
    return snapshot


def row_counts(cur, relations: Iterable[Relation]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for rel in relations:
        cur.execute(
            pg_sql.SQL("SELECT count(*) FROM {}.{}").format(
                pg_sql.Identifier(rel.schema), pg_sql.Identifier(rel.name)
            )
        )
        counts[rel.qualified] = cur.fetchone()[0]
    return counts


def schema_inventory(cur) -> dict[str, int]:
    """Structural fingerprint used to prove the schema did not change."""
    cur.execute(
        """
        SELECT 'base_tables', count(*)::int FROM pg_class c
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE c.relkind IN ('r','p') AND NOT c.relispartition
            AND n.nspname NOT LIKE 'pg\\_%' AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'columns', count(*)::int FROM pg_attribute a
          JOIN pg_class c ON c.oid=a.attrelid
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE c.relkind IN ('r','p') AND a.attnum > 0 AND NOT a.attisdropped
            AND n.nspname NOT LIKE 'pg\\_%' AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'primary_keys', count(*)::int FROM pg_constraint con
          JOIN pg_class c ON c.oid=con.conrelid
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE con.contype='p' AND n.nspname NOT LIKE 'pg\\_%'
            AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'foreign_keys', count(*)::int FROM pg_constraint con
          JOIN pg_class c ON c.oid=con.conrelid
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE con.contype='f' AND n.nspname NOT LIKE 'pg\\_%'
            AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'unique_constraints', count(*)::int FROM pg_constraint con
          JOIN pg_class c ON c.oid=con.conrelid
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE con.contype='u' AND n.nspname NOT LIKE 'pg\\_%'
            AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'check_constraints', count(*)::int FROM pg_constraint con
          JOIN pg_class c ON c.oid=con.conrelid
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE con.contype='c' AND n.nspname NOT LIKE 'pg\\_%'
            AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'indexes', count(*)::int FROM pg_class c
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE c.relkind='i' AND n.nspname NOT LIKE 'pg\\_%'
            AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'sequences', count(*)::int FROM pg_class c
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE c.relkind='S' AND n.nspname NOT LIKE 'pg\\_%'
            AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'views', count(*)::int FROM pg_class c
          JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE c.relkind IN ('v','m') AND n.nspname NOT LIKE 'pg\\_%'
            AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'triggers', count(*)::int FROM pg_trigger WHERE NOT tgisinternal
        UNION ALL
        SELECT 'functions', count(*)::int FROM pg_proc p
          JOIN pg_namespace n ON n.oid=p.pronamespace
          WHERE n.nspname NOT LIKE 'pg\\_%' AND n.nspname <> 'information_schema'
        UNION ALL
        SELECT 'extensions', count(*)::int FROM pg_extension
        """
    )
    return {r[0]: r[1] for r in cur.fetchall()}


def sequence_state(cur) -> dict[str, tuple[int, bool]]:
    """``last_value``/``is_called`` per sequence, to prove none were reset."""
    cur.execute(
        "SELECT schemaname, sequencename FROM pg_sequences "
        "WHERE schemaname NOT LIKE 'pg\\_%' AND schemaname <> 'information_schema' "
        "ORDER BY 1, 2"
    )
    sequences = cur.fetchall()
    state: dict[str, tuple[int, bool]] = {}
    for schema, name in sequences:
        with cur.connection.cursor() as seq_cur:
            seq_cur.execute(
                pg_sql.SQL("SELECT last_value, is_called FROM {}.{}").format(
                    pg_sql.Identifier(schema), pg_sql.Identifier(name)
                )
            )
            state[f"{schema}.{name}"] = seq_cur.fetchone()
    return state


def migration_version(cur) -> list[tuple[str, ...]]:
    """Contents of Alembic bookkeeping, if present. Must survive cleanup."""
    cur.execute(
        "SELECT to_regclass('public.alembic_version') IS NOT NULL"
    )
    if not cur.fetchone()[0]:
        return []
    with cur.connection.cursor() as mig_cur:
        mig_cur.execute("SELECT version_num FROM public.alembic_version ORDER BY 1")
        return mig_cur.fetchall()


# --------------------------------------------------------------------------- #
# plan
# --------------------------------------------------------------------------- #
@dataclass
class CleanupPlan:
    info: DatabaseInfo
    relations: list[Relation]
    protected: list[Relation]
    targets: list[Relation]
    order: list[Relation]
    foreign_keys: list[ForeignKey]
    self_referencing: list[ForeignKey]
    incoming: dict[str, list[ForeignKey]] = field(default_factory=dict)
    outgoing: dict[str, list[ForeignKey]] = field(default_factory=dict)
    row_counts: dict[str, int] = field(default_factory=dict)
    location_cleanup: LocationCleanup | None = None
    # True when the operator named the tables with --only-tables instead of
    # cleaning everything that is not protected.
    targeted: bool = False
    # Kept tables that still hold rows pointing at a target; non-empty means the
    # delete is not safe and must not be forced.
    blockers: list[BlockingReference] = field(default_factory=list)
    # True when this run is allowed to empty public.alembic_version.
    clears_migration: bool = False

    @property
    def expected_rows(self) -> int:
        location = self.location_cleanup
        total = 0
        for target in self.targets:
            rows = self.row_counts.get(target.qualified, 0)
            if location is not None and target.qualified == location.table.qualified:
                rows = len(location.delete_ids)
            total += rows
        return total

    @property
    def location_qualified(self) -> str | None:
        return self.location_cleanup.table.qualified if self.location_cleanup else None


def resolve_protected(
    relations: Sequence[Relation],
    extra_protected: Sequence[str] = (),
    unprotected: Sequence[str] = (),
    only_tables: Sequence[str] = (),
    include_alembic_version: bool = False,
) -> tuple[list[Relation], list[Relation]]:
    """Split relations into (protected, targets).

    ``--unprotect`` is the only way to remove a table from protection, and
    Alembic bookkeeping plus system schemas can never be unprotected.

    ``--only-tables`` is the opposite, narrower mechanism: it names the exact
    tables to empty and protects *everything else*, including tables that are
    normally cleanable. It is the path for finishing off a specific set of
    tables once the rest of the database has already been cleaned. The named
    tables are emptied whatever their normal protection, because the operator
    listed them by name - except Alembic bookkeeping, which additionally
    requires ``--include-alembic-version``.
    """
    by_name = {r.name: r for r in relations}
    protected_names = set(DEFAULT_PROTECTED_TABLES) | set(extra_protected) | set(MIGRATION_TABLES)

    if only_tables:
        unknown = sorted({n for n in only_tables if n not in by_name})
        if unknown:
            raise CleanupError(f"cannot target unknown table(s): {', '.join(unknown)}.")
        if LOCATION_TABLE in only_tables:
            raise CleanupError(
                f"{LOCATION_TABLE!r} cannot be targeted with --only-tables: it has its own "
                f"row-level cleanup path. Use --clean-location-master instead."
            )
        requested = set(only_tables)
        migration_targets = sorted(requested & set(MIGRATION_TABLES))
        if migration_targets and not include_alembic_version:
            raise CleanupError(
                f"refusing to clean Alembic migration bookkeeping "
                f"({', '.join(migration_targets)}) without an explicit acknowledgement. "
                f"Re-run with --include-alembic-version if you really want to empty it."
            )
        if not requested - set(MIGRATION_TABLES):
            raise CleanupError("--only-tables needs at least one table besides Alembic bookkeeping.")

        targets = [r for r in relations if r.name in requested]
        protected = [r for r in relations if r.name not in requested]
        return protected, targets

    if include_alembic_version:
        raise CleanupError(
            "--include-alembic-version only makes sense together with --only-tables; a "
            "blanket cleanup must never empty Alembic migration bookkeeping by accident."
        )

    for name in unprotected:
        if name in MIGRATION_TABLES:
            raise CleanupError(
                f"{name!r} is Alembic migration bookkeeping and can never be unprotected."
            )
        if name not in by_name:
            raise CleanupError(f"cannot unprotect unknown table {name!r}.")
        if name not in protected_names:
            raise CleanupError(f"{name!r} is not a protected table; nothing to unprotect.")

    for name in extra_protected:
        if name not in by_name:
            raise CleanupError(f"cannot protect unknown table {name!r}.")

    protected_names -= set(unprotected)

    protected = [r for r in relations if r.name in protected_names]
    targets = [r for r in relations if r.name not in protected_names]
    return protected, targets


def order_children_first(
    targets: Sequence[Relation],
    foreign_keys: Sequence[ForeignKey],
) -> tuple[list[Relation], list[ForeignKey]]:
    """Topologically order targets so every child is deleted before its parent.

    Self-referencing foreign keys are excluded: a single ``DELETE`` statement
    removes all rows of such a table in one go, so they need no special
    ordering. A genuine cross-table cycle is unresolvable and raises.
    """
    target_set = {r.qualified for r in targets}
    self_referencing: list[ForeignKey] = []
    blockers: dict[str, set[str]] = {r.qualified: set() for r in targets}

    for fk in foreign_keys:
        child_q, parent_q = fk.child.qualified, fk.parent.qualified
        if child_q not in target_set or parent_q not in target_set:
            continue
        if child_q == parent_q:
            self_referencing.append(fk)
            continue
        # the parent cannot be deleted until its referencing child is empty
        blockers[parent_q].add(child_q)

    ready = sorted(q for q, deps in blockers.items() if not deps)
    order: list[Relation] = []
    by_qualified = {r.qualified: r for r in targets}
    placed: set[str] = set()

    while ready:
        current = ready.pop(0)
        order.append(by_qualified[current])
        placed.add(current)
        for candidate, deps in blockers.items():
            if current in deps:
                deps.discard(current)
                if not deps and candidate not in placed and candidate not in ready:
                    ready.append(candidate)
        ready.sort()

    unresolved = sorted(target_set - placed)
    if unresolved:
        raise CleanupError(
            "cannot order a dependency-safe delete; these tables form a "
            f"cross-table foreign-key cycle: {unresolved}"
        )
    return order, self_referencing


def blocking_references(
    targets: Sequence[Relation],
    incoming: dict[str, list[ForeignKey]],
    row_counts: dict[str, int],
) -> list[BlockingReference]:
    """Kept tables whose remaining rows still point at a table being emptied.

    Only foreign keys whose *other* end is also a target are ignored: those
    children are emptied first, so they cannot block anything. Every other
    incoming foreign key is checked against the referencing table's real row
    count, which is what makes the answer trustworthy rather than structural.

    Every ``ON DELETE`` action counts as blocking, including a cascading one:
    silently emptying or cascading into a table the operator did not name would
    modify data this run is not allowed to touch.
    """
    target_qualified = {t.qualified for t in targets}
    blockers: list[BlockingReference] = []
    for target in targets:
        for fk in incoming.get(target.qualified, []):
            if fk.child.qualified in target_qualified:
                continue
            rows = row_counts.get(fk.child.qualified, 0)
            if rows:
                blockers.append(BlockingReference(target, fk.child, fk, rows))
    return sorted(blockers, key=lambda b: (b.child.qualified, b.foreign_key.constraint))


def build_plan(
    conn,
    extra_protected: Sequence[str] = (),
    unprotected: Sequence[str] = (),
    clean_location_master: bool = False,
    include_referenced_locations: bool = False,
    only_tables: Sequence[str] = (),
    include_alembic_version: bool = False,
) -> CleanupPlan:
    """Discover everything needed for cleanup without modifying anything."""
    info = describe_database(conn)
    assert_cleanup_allowed(info)

    with conn.cursor() as cur:
        relations = discover_relations(cur)
        foreign_keys = discover_foreign_keys(cur)

    effective_unprotected = list(unprotected)
    if clean_location_master:
        if not any(r.name == LOCATION_TABLE for r in relations):
            raise CleanupError(
                f"this database has no {LOCATION_TABLE} table; nothing to clean there."
            )
        effective_unprotected.append(LOCATION_TABLE)

    protected, targets = resolve_protected(
        relations,
        extra_protected,
        effective_unprotected,
        only_tables=only_tables,
        include_alembic_version=include_alembic_version,
    )
    order, self_referencing = order_children_first(targets, foreign_keys)

    incoming: dict[str, list[ForeignKey]] = {r.qualified: [] for r in relations}
    outgoing: dict[str, list[ForeignKey]] = {r.qualified: [] for r in relations}
    for fk in foreign_keys:
        outgoing.setdefault(fk.child.qualified, []).append(fk)
        incoming.setdefault(fk.parent.qualified, []).append(fk)

    plan = CleanupPlan(
        info=info,
        relations=relations,
        protected=protected,
        targets=targets,
        order=order,
        foreign_keys=foreign_keys,
        self_referencing=self_referencing,
        incoming=incoming,
        outgoing=outgoing,
        targeted=bool(only_tables),
        clears_migration=include_alembic_version
        and any(r.name in MIGRATION_TABLES for r in targets),
    )

    if clean_location_master:
        location = next(r for r in relations if r.name == LOCATION_TABLE)
        with conn.cursor() as cur:
            plan.location_cleanup = analyse_location_cleanup(
                cur, location, protected, include_referenced_locations
            )
        # Every table that references location_master must be emptied (or kept)
        # before its rows go, so the location table is always deleted last.
        plan.order = [r for r in order if r.qualified != location.qualified] + [location]
        plan.location_cleanup.deferred = True

    with conn.cursor() as cur:
        plan.row_counts = row_counts(cur, relations)

    # Row counts come last on purpose: whether a kept table blocks a target can
    # only be answered once we know how many rows it still holds.
    #
    # Only a targeted run needs this. In a default run, emptying the children of
    # a populated protected parent is the whole point, so a kept table holding
    # rows that point at a target is expected rather than a blocker.
    if plan.targeted:
        plan.blockers = blocking_references(plan.targets, plan.incoming, plan.row_counts)

    validate_plan(plan)
    return plan


def validate_plan(plan: CleanupPlan) -> None:
    """Refuse any plan that could damage protected data or the schema."""
    target_q = {t.qualified for t in plan.targets}
    location_q = plan.location_qualified

    for rel in plan.protected:
        for fk in plan.outgoing.get(rel.qualified, []):
            if fk.parent.qualified not in target_q:
                continue
            if fk.parent.qualified == location_q:
                # Handled deliberately by the location plan, which only removes
                # rows that nothing kept references unless the operator opted in.
                continue
            if plan.targeted:
                # A targeted run empties only the tables the operator named, and
                # an empty referencing table cannot be damaged by emptying its
                # parent. Whether a *populated* kept table blocks the delete is
                # answered by plan.blockers, which reports the exact
                # referencing table and constraint instead of guessing.
                continue
            hint = ""
            if fk.parent.name == LOCATION_TABLE:
                hint = (
                    f"\n  To clear {fk.parent.qualified} use --clean-location-master, which "
                    "analyses every referencing table first and keeps the locations that "
                    "other data still needs."
                )
            raise CleanupError(
                f"refusing to clean: protected table {rel.qualified} is a child of "
                f"{fk.parent.qualified}, which is scheduled for deletion. Cleaning the "
                "parent would leave the protected table with dangling references." + hint
            )

    if plan.location_cleanup is not None:
        validate_location_cleanup(plan)

    if not plan.targets:
        raise CleanupError("no tables selected for cleanup; nothing to do.")


def describe_blockers(blockers: Sequence[BlockingReference]) -> str:
    """Explain, table by table, why a safe delete is not currently possible."""
    lines = [
        f"  {b.target.qualified} is referenced by {b.describe()}" for b in blockers
    ]
    kept = sorted({b.child.qualified for b in blockers})
    return (
        "safe deletion is not possible without modifying tables that were not "
        "selected for cleanup:\n"
        + "\n".join(lines)
        + "\n  referencing table(s): "
        + ", ".join(kept)
        + "\n  those rows are left untouched. Empty them in a separate, explicitly "
        "confirmed run, or re-run this cleanup naming those tables too."
    )


def validate_location_cleanup(plan: CleanupPlan) -> None:
    """Extra guarantees specific to deleting ``location_master`` rows."""
    cleanup = plan.location_cleanup
    assert cleanup is not None

    if not cleanup.rows:
        raise CleanupError(f"{cleanup.table.qualified} contains no rows; nothing to clean.")

    overlap = set(cleanup.keep_ids) & set(cleanup.delete_ids)
    if overlap:
        raise CleanupError(
            f"internal error: location ids both kept and deleted: {sorted(overlap)}"
        )
    if set(cleanup.keep_ids) | set(cleanup.delete_ids) != {r.id for r in cleanup.rows}:
        raise CleanupError(
            f"internal error: location plan does not account for every row of "
            f"{cleanup.table.qualified}."
        )

    if cleanup.delete_ids and not cleanup.include_referenced:
        # Without the override, no kept table may reference a row we are about to
        # delete. This is the interlock that keeps reference data intact.
        for row_id, deps in cleanup.kept.items():
            if row_id in cleanup.delete_ids:
                raise CleanupError(
                    f"refusing to clean location {row_id}: kept data still references it "
                    f"via {deps[0].describe()}."
                )

    position = {rel.qualified: i for i, rel in enumerate(plan.order)}
    if position.get(cleanup.table.qualified) != len(plan.order) - 1:
        raise CleanupError(
            f"internal error: {cleanup.table.qualified} must be deleted last, after "
            "every table that references it."
        )


# --------------------------------------------------------------------------- #
# backup
# --------------------------------------------------------------------------- #
def find_pg_tool(tool: str) -> str | None:
    """Locate a PostgreSQL client binary (PATH, ``PG_BIN``, or install layout)."""
    exe = f"{tool}.exe" if os.name == "nt" else tool
    override = os.environ.get("PG_BIN")
    if override:
        candidate = Path(override) / exe
        if candidate.is_file():
            return str(candidate)

    found = shutil.which(exe) or shutil.which(tool)
    if found:
        return found

    roots = [Path(os.environ.get("ProgramFiles", r"C:\Program Files"))]
    if os.name == "nt":
        roots.append(Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")))
    for root in roots:
        install_root = root / "PostgreSQL"
        if not install_root.is_dir():
            continue
        for version_dir in sorted(install_root.iterdir(), reverse=True):
            candidate = version_dir / "bin" / exe
            if candidate.is_file():
                return str(candidate)
    return None


def _pg_env(parts: dict) -> dict[str, str]:
    """Environment for pg_dump/pg_restore/psql with the password out of argv."""
    env = dict(os.environ)
    if parts["password"]:
        env["PGPASSWORD"] = parts["password"]
    return env


def _unique_path(directory: Path, stem: str, suffix: str) -> Path:
    """Never overwrite: append ``_1``, ``_2`` ... if the name is taken."""
    candidate = directory / f"{stem}{suffix}"
    counter = 1
    while candidate.exists():
        candidate = directory / f"{stem}_{counter}{suffix}"
        counter += 1
    return candidate


def create_backup(
    database_url: str,
    backup_dir: Path,
    label: str = BACKUP_PREFIX,
) -> Path:
    """Create a timestamped custom-format ``pg_dump``. Never overwrites."""
    parts = _url_parts(database_url)
    pg_dump = find_pg_tool("pg_dump")
    if pg_dump is None:
        raise CleanupError(
            "pg_dump was not found. Install the PostgreSQL client tools or set "
            "PG_BIN to their bin directory. Aborting: cleanup requires a backup."
        )

    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = _unique_path(backup_dir, f"{parts['dbname']}_{label}_{stamp}", ".dump")

    result = subprocess.run(
        [
            pg_dump,
            "-h", parts["host"],
            "-p", str(parts["port"]),
            "-U", parts["user"],
            "-d", parts["dbname"],
            "-Fc",
            "--no-owner",
            "--no-privileges",
            "-f", str(target),
        ],
        env=_pg_env(parts),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        if target.exists():
            target.unlink()
        raise CleanupError(f"pg_dump failed (exit {result.returncode}): {result.stderr.strip()}")
    if not target.exists() or target.stat().st_size == 0:
        raise CleanupError(f"pg_dump produced an empty backup at {target}")
    return target


def verify_backup(backup_path: Path) -> dict:
    """Verify the archive is non-empty and structurally readable.

    ``pg_restore --list`` parses the archive table of contents without writing
    anything, which is enough to prove the dump is a valid, complete backup.
    """
    if not backup_path.is_file():
        raise CleanupError(f"backup file is missing: {backup_path}")
    size = backup_path.stat().st_size
    if size == 0:
        raise CleanupError(f"backup file is empty: {backup_path}")

    digest = hashlib.sha256()
    with backup_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)

    pg_restore = find_pg_tool("pg_restore")
    if pg_restore is None:
        raise CleanupError(
            "pg_restore was not found, so the backup cannot be validated. "
            "Aborting: cleanup requires a verified backup."
        )

    result = subprocess.run(
        [pg_restore, "--list", str(backup_path)], capture_output=True, text=True
    )
    if result.returncode != 0:
        raise CleanupError(
            f"pg_restore --list failed for {backup_path} (exit {result.returncode}): "
            f"{result.stderr.strip()}"
        )

    entries = [line for line in result.stdout.splitlines() if ";" in line and line[:1].isdigit()]
    table_data = [line for line in entries if " TABLE DATA " in line]
    if not table_data:
        raise CleanupError(f"backup {backup_path} contains no table data entries.")

    return {
        "path": backup_path,
        "size_bytes": size,
        "sha256": digest.hexdigest(),
        "toc_entries": len(entries),
        "table_data_entries": len(table_data),
    }


def schema_signature(database_url: str) -> str | None:
    """SHA-256 of a schema-only dump with volatile lines removed.

    Returns ``None`` when ``pg_dump`` is unavailable, so callers can fall back to
    the catalog inventory comparison.
    """
    parts = _url_parts(database_url)
    pg_dump = find_pg_tool("pg_dump")
    if pg_dump is None:
        return None

    result = subprocess.run(
        [
            pg_dump,
            "-h", parts["host"],
            "-p", str(parts["port"]),
            "-U", parts["user"],
            "-d", parts["dbname"],
            "--schema-only",
            "--no-owner",
            "--no-privileges",
        ],
        env=_pg_env(parts),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise CleanupError(f"pg_dump --schema-only failed: {result.stderr.strip()}")

    lines = [
        line
        for line in result.stdout.splitlines()
        if not line.startswith(_VOLATILE_DUMP_LINE_PREFIXES)
    ]
    return hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------- #
# execution
# --------------------------------------------------------------------------- #
@dataclass
class ExecutionResult:
    deleted_rows: dict[str, int] = field(default_factory=dict)
    protected_counts: dict[str, int] = field(default_factory=dict)
    protected_baseline: dict[str, int] = field(default_factory=dict)
    migration_rows: list[tuple[str, ...]] = field(default_factory=list)
    migration_baseline: list[tuple[str, ...]] = field(default_factory=list)
    sequences_after: dict[str, tuple[int, bool]] = field(default_factory=dict)
    sequences_before: dict[str, tuple[int, bool]] = field(default_factory=dict)
    inventory_before: dict[str, int] = field(default_factory=dict)
    inventory_after: dict[str, int] = field(default_factory=dict)
    signature_before: str | None = None
    signature_after: str | None = None
    location_reference_before: dict[str, list[tuple]] = field(default_factory=dict)
    location_links_preserved: bool | None = None
    location_rows_deleted: int = 0
    location_rows_kept: int = 0
    after_counts: dict[str, int] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)

    @property
    def total_deleted(self) -> int:
        return sum(self.deleted_rows.values())


def delete_relations_in_order(conn, order: Sequence[Relation]) -> dict[str, int]:
    """Delete each relation's rows in the given order. Caller owns the txn."""
    deleted: dict[str, int] = {}
    for rel in order:
        with conn.cursor() as cur:
            cur.execute(
                pg_sql.SQL("DELETE FROM {}.{}").format(
                    pg_sql.Identifier(rel.schema), pg_sql.Identifier(rel.name)
                )
            )
            deleted[rel.qualified] = cur.rowcount
    return deleted


def delete_location_rows(conn, cleanup: LocationCleanup) -> int:
    """Delete only the approved location rows, by primary key.

    No cascading and no constraint disabling: a row that something still needs
    was never selected, so this can only ever remove unreferenced locations.
    """
    with conn.cursor() as cur:
        cur.execute(
            pg_sql.SQL("DELETE FROM {}.{} WHERE id = ANY(%s)").format(
                pg_sql.Identifier(cleanup.table.schema),
                pg_sql.Identifier(cleanup.table.name),
            ),
            (list(cleanup.delete_ids),),
        )
        return cur.rowcount


def surviving_location_ids(cur, cleanup: LocationCleanup) -> list[int]:
    cur.execute(
        pg_sql.SQL("SELECT id FROM {}.{} ORDER BY id").format(
            pg_sql.Identifier(cleanup.table.schema),
            pg_sql.Identifier(cleanup.table.name),
        )
    )
    return [r[0] for r in cur.fetchall()]


def execute_cleanup(conn, plan: CleanupPlan, result: ExecutionResult) -> None:
    """Run every delete in one transaction, verifying before commit.

    Any failure rolls the transaction back, so the database is left exactly as
    it was found; no table is silently skipped.
    """
    # building the plan leaves a read-only transaction open; discard it so the
    # autocommit switch below is legal
    if not conn.autocommit:
        conn.rollback()
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            result.sequences_before = sequence_state(cur)
            result.inventory_before = schema_inventory(cur)
            result.migration_baseline = migration_version(cur)
            if plan.location_cleanup is not None:
                result.location_reference_before = location_reference_snapshot(
                    cur, plan.location_cleanup, plan.protected
                )
        result.signature_before = schema_signature(resolve_database_url())

        # Re-checked inside the transaction: the plan was built earlier, and rows
        # may have been inserted into a referencing table since then. Refusing
        # here is what guarantees a targeted delete is never forced.
        if plan.targeted:
            with conn.cursor() as cur:
                live_counts = row_counts(cur, plan.relations)
            live_blockers = blocking_references(plan.targets, plan.incoming, live_counts)
            if live_blockers:
                raise CleanupError("refusing to delete: " + describe_blockers(live_blockers))

        cleanup = plan.location_cleanup
        result.location_rows_kept = len(cleanup.keep_ids) if cleanup else 0
        bulk_order = [r for r in plan.order if r.qualified != plan.location_qualified]
        expected = plan.expected_rows
        print(f"  deleting {len(bulk_order)} tables inside a single transaction ...")

        result.deleted_rows = delete_relations_in_order(conn, bulk_order)
        total = result.total_deleted
        if cleanup is not None and cleanup.delete_ids:
            print(
                f"  deleting {len(cleanup.delete_ids)} unreferenced row(s) from "
                f"{cleanup.table.qualified} last ..."
            )
            result.deleted_rows[cleanup.table.qualified] = delete_location_rows(conn, cleanup)
            result.location_rows_deleted = result.deleted_rows[cleanup.table.qualified]
            total = result.total_deleted

        if total != expected:
            raise CleanupError(
                f"deleted row count {total} does not match the planned {expected}; rolling back."
            )

        with conn.cursor() as cur:
            after_counts = row_counts(cur, bulk_order)
            # after_counts covers the bulk targets only. The location table is
            # verified separately below against the ids it was supposed to keep,
            # because it is allowed to retain rows.
            result.after_counts = dict(after_counts)
            not_empty = {q: n for q, n in after_counts.items() if n}
            if not_empty:
                raise CleanupError(f"tables still non-empty after delete: {not_empty}")

            if cleanup is not None:
                survivors = surviving_location_ids(cur, cleanup)
                result.after_counts[cleanup.table.qualified] = len(survivors)
                if survivors != sorted(cleanup.keep_ids):
                    raise CleanupError(
                        f"{cleanup.table.qualified} should hold exactly "
                        f"{sorted(cleanup.keep_ids)} after cleanup but holds {survivors}; "
                        "rolling back."
                    )
                if not cleanup.include_referenced:
                    # Nothing kept may have been unlinked by this cleanup.
                    after_snapshot = location_reference_snapshot(
                        cur, cleanup, plan.protected
                    )
                    if after_snapshot != result.location_reference_before:
                        raise CleanupError(
                            "cleaning locations changed a protected table's location "
                            f"references ({sorted(result.location_reference_before)}); "
                            "rolling back."
                        )
                    result.location_links_preserved = True

            for rel in plan.protected:
                cur.execute(
                    pg_sql.SQL("SELECT count(*) FROM {}.{}").format(
                        pg_sql.Identifier(rel.schema), pg_sql.Identifier(rel.name)
                    )
                )
                result.protected_counts[rel.qualified] = cur.fetchone()[0]
                expected_count = plan.row_counts.get(rel.qualified)
                if result.protected_counts[rel.qualified] != expected_count:
                    raise CleanupError(
                        f"protected table {rel.qualified} changed from {expected_count} "
                        f"to {result.protected_counts[rel.qualified]}; rolling back."
                    )

            result.sequences_after = sequence_state(cur)
            if result.sequences_after != result.sequences_before:
                changed = sorted(
                    name
                    for name in result.sequences_before
                    if result.sequences_before[name] != result.sequences_after.get(name)
                )
                raise CleanupError(f"sequence values changed unexpectedly: {changed}")

            result.migration_rows = migration_version(cur)
            # Normally the Alembic bookkeeping must survive untouched. When the
            # operator explicitly opted in, the *only* acceptable outcome is an
            # empty table - so both a stray row and a lost table still roll back.
            expected_migration = [] if plan.clears_migration else result.migration_baseline
            if result.migration_rows != expected_migration:
                raise CleanupError(
                    f"unexpected Alembic migration bookkeeping state {result.migration_rows!r} "
                    f"(expected {expected_migration!r}); rolling back."
                )
            if plan.clears_migration and result.migration_rows:
                raise CleanupError("alembic_version was targeted but is not empty; rolling back.")

            result.inventory_after = schema_inventory(cur)
            if result.inventory_after != result.inventory_before:
                raise CleanupError(
                    "database objects changed during cleanup "
                    f"({result.inventory_before} -> {result.inventory_after}); rolling back."
                )

        conn.commit()
        print(f"  committed {total:,} deleted rows across {len(plan.order)} tables")
    except Exception:
        conn.rollback()
        raise

    # taken after the commit so a separate pg_dump connection can see the result
    result.signature_after = schema_signature(resolve_database_url())


# --------------------------------------------------------------------------- #
# confirmation + reporting
# --------------------------------------------------------------------------- #
def confirm_execution(info: DatabaseInfo, assume_yes: bool) -> bool:
    """Require an explicit, deliberate confirmation before destructive SQL."""
    if assume_yes:
        print("  confirmation: --yes supplied, proceeding without an interactive prompt")
        return True

    prompt = (
        f"\n  DESTRUCTIVE: this deletes application data from database "
        f"'{info.database}'.\n  Type the database name to confirm, anything else to abort: "
    )
    if not sys.stdin or not sys.stdin.isatty():
        print(prompt)
        print("  aborted: no interactive terminal. Re-run with --yes to confirm non-interactively.")
        return False

    try:
        answer = input(prompt).strip()
    except (EOFError, KeyboardInterrupt):
        print("\n  aborted.")
        return False
    if answer != info.database:
        print("  aborted: confirmation did not match the database name.")
        return False
    return True


def _print_header(title: str) -> None:
    print("=" * 100)
    print(title)
    print("=" * 100)


def _schema_intact(result: "ExecutionResult") -> bool:
    """True when every structural check the transaction made came back clean."""
    return (
        not result.errors
        and result.inventory_after == result.inventory_before
        and result.sequences_after == result.sequences_before
        and (result.signature_after is None
             or result.signature_after == result.signature_before)
    )


def print_target_dependencies(plan: CleanupPlan, verb: str = "WOULD") -> None:
    """Spell out every foreign key that touches a table selected for emptying.

    Each edge is resolved against the real row counts so the report says which
    referencing tables are merely emptied earlier in the same run, which are
    already empty, and which would actually block the delete.
    """
    _print_header(f"FOREIGN KEY DEPENDENCIES OF THE SELECTED TABLES - {verb} BE EMPTIED")
    target_qualified = {rel.qualified for rel in plan.targets}

    for index, rel in enumerate(plan.order, 1):
        rows = plan.row_counts.get(rel.qualified, 0)
        print(f"\n  {index:>3}. {rel.qualified}  ({rows:,} rows)")

        incoming = plan.incoming.get(rel.qualified, [])
        if not incoming:
            print("        referenced by : no foreign keys")
        for fk in incoming:
            child_rows = plan.row_counts.get(fk.child.qualified, 0)
            if fk.child.qualified in target_qualified:
                note = f"emptied earlier in this same run ({child_rows:,} rows)"
            elif child_rows:
                note = f"BLOCKS THIS RUN - {child_rows:,} rows in a table being kept"
            else:
                note = "already empty, does not block"
            print(
                f"        <- {fk.child.qualified} [{fk.constraint}] "
                f"ON DELETE {fk.on_delete}: {note}"
            )

        outgoing = plan.outgoing.get(rel.qualified, [])
        if not outgoing:
            print("        references    : no foreign keys")
        for fk in outgoing:
            parent_rows = plan.row_counts.get(fk.parent.qualified, 0)
            print(
                f"        -> {fk.parent.qualified} [{fk.constraint}] "
                f"ON DELETE {fk.on_delete}: parent keeps {parent_rows:,} rows"
            )

    print("\n  no constraint is dropped, disabled or bypassed; every delete above is a "
          "plain\n  DELETE that PostgreSQL itself checks against these foreign keys.")


def print_alembic_warning(plan: CleanupPlan, past: bool = False) -> None:
    """Warn that emptying the Alembic bookkeeping table needs careful recovery."""
    if not plan.clears_migration:
        return
    _print_header(
        "ALEMBIC MIGRATION VERSION TABLE - NOW EMPTY"
        if past
        else "ALEMBIC MIGRATION VERSION TABLE - WARNING"
    )
    state = "is now empty" if past else "WILL be emptied"
    print(f"  public.alembic_version {state}.")
    print("  The table, its column, its primary key, its constraints and every migration")
    print("  script in backend/alembic/versions/ are untouched. Only the single row that")
    print("  records the current revision is removed. No migration is run, and no")
    print("  migration history is regenerated, rewritten or stamped.")
    print()
    print("  CONSEQUENCE: Alembic will now report the database as being at no revision, and")
    print("  'alembic upgrade head' will try to re-apply every migration from the base")
    print("  revision onwards. Migrations that guard with create-if-not-exists become")
    print("  no-ops, but a migration without such a guard can fail, and the recorded")
    print("  history looks wrong until the version row is put back.")
    print()
    print("  RECOVERY if that happens: re-insert the revision this database was built at -")
    print(f"      {ALEMBIC_RECOVERY_HINT}")
    print("  Take the revision id from backend/alembic/versions/, and review every")
    print("  migration between that revision and the base before running any further")
    print("  migration command.")


def print_blockers(plan: CleanupPlan) -> None:
    """Name every kept table and constraint that prevents a safe delete."""
    if not plan.blockers:
        return
    _print_header("BLOCKING FOREIGN KEY DEPENDENCIES - DELETION IS NOT SAFE")
    print(describe_blockers(plan.blockers))


def print_report(
    plan: CleanupPlan,
    result: ExecutionResult | None = None,
    backup: Path | None = None,
    backup_details: dict | None = None,
    errors: Sequence[str] = (),
) -> None:
    _print_header("RAILFLOW AI DATABASE CLEANUP REPORT")
    print(f"  target        : {plan.info.describe()}")
    print(f"  mode          : {'execute' if result else 'read-only'}")
    print(f"  tables found  : {len(plan.relations)}")
    print(f"  to be cleaned : {len(plan.targets)}")
    print(f"  protected     : {len(plan.protected)}")

    _print_header("TABLES TO CLEAN (children-first delete order)")
    for index, rel in enumerate(plan.order, 1):
        before = plan.row_counts.get(rel.qualified, 0)
        deleted = result.deleted_rows.get(rel.qualified) if result is not None else None
        suffix = f"  ->  {deleted:>8,} rows" if deleted is not None else ""
        print(f"  {index:>3}. {rel.qualified:<40} {before:>10,} rows{suffix}")

    _print_header("PROTECTED TABLES (never deleted)")
    for rel in plan.protected:
        print(f"      {rel.qualified:<40} {plan.row_counts.get(rel.qualified, 0):>10,} rows")

    if backup is not None:
        _print_header("BACKUP")
        print(f"  location : {backup}")
        if backup_details:
            print(f"  size     : {backup_details['size_bytes']:,} bytes")
            print(f"  sha256   : {backup_details['sha256']}")
            print(f"  contents : {backup_details['toc_entries']} TOC entries, "
                  f"{backup_details['table_data_entries']} table-data entries (verified)")

    if result is not None:
        _print_header("RESULT")
        print(f"  tables cleaned        : {len(result.deleted_rows)}")
        print(f"  rows deleted          : {result.total_deleted:,}")
        for rel in plan.order:
            before = plan.row_counts.get(rel.qualified, 0)
            after = result.after_counts.get(rel.qualified, 0)
            flag = "" if after == 0 else "   <-- NOT EMPTY"
            print(
                f"      {rel.qualified:<40} {before:>8,} -> {after:>8,} rows{flag}"
            )
        print(f"  protected unchanged   : "
              f"{'yes' if not result.errors else 'NO - see errors'}")
        print(f"  alembic bookkeeping   : "
              f"{'emptied as explicitly approved' if plan.clears_migration and not result.migration_rows else ('unchanged' if result.migration_rows == result.migration_baseline else 'CHANGED')}")
        print(f"  sequences untouched   : "
              f"{'yes' if result.sequences_after == result.sequences_before else 'NO'}")
        print(f"  database objects      : "
              f"{'unchanged' if result.inventory_after == result.inventory_before else 'CHANGED'}")
        if result.signature_before and result.signature_after:
            same = result.signature_before == result.signature_after
            print(f"  schema signature      : "
                  f"{'identical' if same else 'CHANGED'} ({result.signature_before[:16]}...)")
        elif result.signature_before is None:
            print("  schema signature      : skipped (pg_dump unavailable); "
                  "catalog inventory was still compared")
        print(f"  transaction           : committed")
        print(f"  schema-integrity      : "
              f"{'VERIFIED - tables, primary keys, foreign keys, constraints, indexes, sequences, views, triggers and functions all unchanged' if _schema_intact(result) else 'FAILED'}")

    if errors:
        _print_header("ERRORS")
        for err in errors:
            print(f"  ! {err}")

    if result is not None:
        print_alembic_warning(plan, past=True)


def print_location_plan(plan: CleanupPlan, verb: str = "WOULD") -> None:
    """Spell out every location row involved and everything that depends on it."""
    cleanup = plan.location_cleanup
    if cleanup is None:
        return
    dependencies = cleanup.all_dependencies

    _print_header(f"LOCATION MASTER CLEANUP ({LOCATION_TABLE}) - {verb} BE DELETED")
    print(f"  table                 : {cleanup.table.qualified}")
    print(f"  total rows            : {len(cleanup.rows)}")
    print(f"  rows to delete        : {len(cleanup.delete_ids)}")
    print(f"  rows preserved        : {len(cleanup.keep_ids)}")
    print(f"  preserved in use by   : kept tables only (tables being cleaned are emptied first)")

    print(f"\n  LOCATION ROWS THAT {verb} BE DELETED")
    if cleanup.delete_ids:
        for row in cleanup.rows:
            if row.id in cleanup.delete_ids:
                print(f"      id={row.id:<8} {row.label:<52} (nothing references it)")
    else:
        print("      (none - every location row is still referenced by kept data)")

    print(f"\n  LOCATION ROWS PRESERVED BECAUSE KEPT DATA STILL NEEDS THEM")
    if cleanup.keep_ids:
        for row_id in cleanup.keep_ids:
            print(f"      id={row_id:<8} {cleanup.label_for(row_id)}")
            for dep in dependencies.get(row_id, []):
                print(f"           kept by {dep.describe()}")
    else:
        print("      (none)")

    if cleanup.include_referenced and cleanup.nulled:
        print(f"\n  RECORDS THAT WILL BE UNLINKED (approved via --include-referenced-locations)")
        for row_id, deps in cleanup.nulled.items():
            for dep in deps:
                print(f"      location id={row_id:<8} {cleanup.label_for(row_id)}")
                print(f"           unlinks {dep.describe()}")
        print("      a foreign key marked ON DELETE SET NULL will be set to NULL on those rows")

    print(f"\n  SAFE DELETE ORDER: {cleanup.table.qualified} is emptied LAST, after every")
    print("  table that references it. No cascading deletes and no disabled constraints.")


def print_location_result(plan: CleanupPlan, result: ExecutionResult) -> None:
    cleanup = plan.location_cleanup
    if cleanup is None or result is None:
        return
    _print_header("LOCATION MASTER RESULT")
    print(f"  rows deleted          : {result.location_rows_deleted}")
    print(f"  rows preserved        : {result.location_rows_kept}")
    if result.location_links_preserved is True:
        print("  protected references  : unchanged (verified value by value)")
    elif cleanup.include_referenced:
        print("  protected references  : unlinked as explicitly approved")


def print_inspection(plan: CleanupPlan) -> None:
    _print_header("APPLICATION TABLES")
    print(f"  {'table':<44}{'rows':>10}  {'status':<10} {'in FK':>6} {'out FK':>7}")
    for rel in plan.relations:
        status = "PROTECTED" if rel in plan.protected else "cleanable"
        print(f"  {rel.qualified:<44}{plan.row_counts.get(rel.qualified, 0):>10,}  "
              f"{status:<10} {len(plan.incoming.get(rel.qualified, [])):>6} "
              f"{len(plan.outgoing.get(rel.qualified, [])):>7}")

    _print_header(f"FOREIGN KEYS ({len(plan.foreign_keys)})")
    for fk in plan.foreign_keys:
        print(f"  {fk.describe()}")

    if plan.self_referencing:
        _print_header("SELF-REFERENCING FOREIGN KEYS (handled by a single DELETE)")
        for fk in plan.self_referencing:
            print(f"  {fk.describe()}")

    _print_header("PROTECTED TABLES (retained)")
    for rel in plan.protected:
        print(f"  {rel.qualified:<44}{plan.row_counts.get(rel.qualified, 0):>10,} rows")

    if any(r.name == LOCATION_TABLE for r in plan.protected):
        _print_header("LOCATION MASTER")
        location = next(r for r in plan.protected if r.name == LOCATION_TABLE)
        referencing = plan.incoming.get(location.qualified, [])
        print(f"  {location.qualified} is protected, so its rows are left untouched.")
        print(f"  referenced by {len(referencing)} foreign key(s):")
        for fk in referencing:
            child_rows = plan.row_counts.get(fk.child.qualified, 0)
            print(f"    {fk.child.qualified}.* [{fk.constraint}] "
                  f"ON DELETE {fk.on_delete} - {child_rows:,} rows")
        print(f"  to clean it: re-run with --clean-location-master")

    _print_header("SUMMARY")
    print(f"  database              : {plan.info.database}")
    print(f"  tables to clean       : {len(plan.targets)}")
    print(f"  rows that would be deleted : {plan.expected_rows:,}")
    print(f"  protected tables      : {', '.join(r.name for r in plan.protected)}")


# --------------------------------------------------------------------------- #
# modes
# --------------------------------------------------------------------------- #
def run_inspect(plan: CleanupPlan) -> int:
    print_inspection(plan)
    print("\n  inspection only - nothing was modified.")
    return EXIT_OK


def run_dry_run(plan: CleanupPlan) -> int:
    _print_header("DRY RUN - nothing will be modified")
    print(f"  database        : {plan.info.database}")
    print(f"  backup          : would be created before any real deletion")
    print(f"  rows to delete  : {plan.expected_rows:,}")
    print("\n  tables that WOULD be emptied (children-first order):")
    for index, rel in enumerate(plan.order, 1):
        rows = plan.row_counts.get(rel.qualified, 0)
        if rel.qualified == plan.location_qualified:
            cleanup = plan.location_cleanup
            print(f"  {index:>3}. DELETE FROM {rel.qualified:<40} -- {len(cleanup.delete_ids):>8,} rows "
                  f"(of {rows:,}; only unreferenced ids)")
            continue
        print(f"  {index:>3}. DELETE FROM {rel.qualified:<40} -- {rows:>8,} rows")
    print("\n  tables that would be PROTECTED:")
    for rel in plan.protected:
        print(f"      {rel.qualified:<40} {plan.row_counts.get(rel.qualified, 0):>8,} rows kept")
    print_location_plan(plan, "WOULD")
    print_target_dependencies(plan, "WOULD")
    print_alembic_warning(plan)
    print_blockers(plan)
    if plan.blockers:
        print("\n  RESULT: BLOCKED - the tables above cannot be emptied without first")
        print("  emptying the referencing tables, which were not selected. Nothing was modified.")
        return EXIT_ERROR
    print("\n  dry run complete - no data was modified.")
    return EXIT_OK


def run_backup(plan: CleanupPlan, database_url: str, backup_dir: Path) -> int:
    print(f"  creating backup of '{plan.info.database}' in {backup_dir} ...")
    backup = create_backup(database_url, backup_dir)
    details = verify_backup(backup)
    print(f"  backup verified: {details['size_bytes']:,} bytes, "
          f"{details['table_data_entries']} table-data entries")
    print("  no data was deleted.")
    return EXIT_OK


def run_execute(
    conn,
    plan: CleanupPlan,
    database_url: str,
    backup_dir: Path,
    assume_yes: bool,
) -> int:
    _print_header("PRE-EXECUTION PLAN")
    print(f"  database           : {plan.info.database} ({plan.info.host}:{plan.info.port})")
    print(f"  selection          : "
          f"{'TARGETED - only the tables named with --only-tables' if plan.targeted else 'everything not protected'}")
    print(f"  tables to clean    : {len(plan.targets)}")
    print(f"  expected deletions : {plan.expected_rows:,} rows")
    print("  protected tables   : " + ", ".join(r.name for r in plan.protected))
    print(f"  location cleanup   : "
          f"{'ENABLED' if plan.location_cleanup else 'disabled (use --clean-location-master)'}")

    print_location_plan(plan, "WILL")
    print_target_dependencies(plan, "WILL")
    print_alembic_warning(plan)

    if plan.blockers:
        print_blockers(plan)
        print("\n  RESULT: BLOCKED - nothing was backed up, nothing was deleted.")
        return EXIT_ERROR

    backup = create_backup(database_url, backup_dir)
    details = verify_backup(backup)
    print(f"\n  backup verified    : {backup}")
    print(f"                        {details['size_bytes']:,} bytes, sha256 {details['sha256'][:16]}...")

    if not confirm_execution(plan.info, assume_yes):
        print("\n  aborted before any data was deleted.")
        return EXIT_ABORTED

    result = ExecutionResult()
    errors: list[str] = []
    try:
        execute_cleanup(conn, plan, result)
    except Exception as exc:  # noqa: BLE001 - reported, never swallowed
        errors.append(f"{type(exc).__name__}: {exc}")
        print(f"\n  cleanup failed and was rolled back: {exc}")

    print_report(plan, result if not errors else None, backup, details, errors)
    print_location_result(plan, result if not errors else None)
    if errors:
        print("\n  RESULT: FAILED - transaction rolled back, database unchanged.")
        return EXIT_ERROR

    # A plain run must leave every selected table genuinely empty. The
    # location-master path is exempt: it deliberately keeps the locations that
    # other data still needs, which execute_cleanup verifies on its own.
    still_full = (
        {q: n for q, n in result.after_counts.items() if n}
        if plan.location_cleanup is None
        else {}
    )
    if still_full:
        print(f"\n  RESULT: FAILED - PostgreSQL still reports rows in {still_full}.")
        return EXIT_ERROR

    print("\n  RESULT: SUCCESS - every selected table is empty; schema, constraints,")
    print("  indexes, sequences, triggers and relationships are unchanged.")
    return EXIT_OK


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="db_cleanup_tool",
        description=(
            "Safely clear RAILFLOW AI application data from PostgreSQL while "
            "preserving the schema, constraints, indexes, sequences and Alembic "
            "migration state. Inspection is the default; nothing is deleted "
            "without --execute."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python scripts/db_cleanup_tool.py\n"
            "  python scripts/db_cleanup_tool.py --dry-run\n"
            "  python scripts/db_cleanup_tool.py --backup\n"
            "  python scripts/db_cleanup_tool.py --execute\n"
            "  python scripts/db_cleanup_tool.py --execute --yes   # non-interactive\n"
            "\n"
            "location master (off by default):\n"
            "  python scripts/db_cleanup_tool.py --dry-run --clean-location-master\n"
            "  python scripts/db_cleanup_tool.py --execute --clean-location-master\n"
            "  # also drop locations that kept data still references (explicit opt-in)\n"
            "  python scripts/db_cleanup_tool.py --dry-run --clean-location-master \\\n"
            "      --include-referenced-locations\n"
            "\n"
            "targeted run (only the tables you name are emptied):\n"
            "  python scripts/db_cleanup_tool.py --dry-run --only-tables asset_master\n"
            "  python scripts/db_cleanup_tool.py --execute --only-tables asset_master \\\n"
            "      --only-tables planning_resource --only-tables source_system\n"
            "  # emptying the Alembic bookkeeping table needs its own explicit opt-in\n"
            "  python scripts/db_cleanup_tool.py --dry-run --only-tables alembic_version \\\n"
            "      --include-alembic-version\n"
        ),
    )
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument(
        "--inspect", action="store_true",
        help="list tables, row counts, foreign keys and protected tables (default)",
    )
    modes.add_argument(
        "--dry-run", action="store_true",
        help="show exactly which tables and rows would be deleted; changes nothing",
    )
    modes.add_argument(
        "--backup", action="store_true",
        help="create and verify a pg_dump backup; deletes nothing",
    )
    modes.add_argument(
        "--execute", action="store_true",
        help="perform the cleanup (requires a verified backup and confirmation)",
    )

    parser.add_argument(
        "--protect", action="append", default=[], metavar="TABLE",
        help="additionally protect TABLE from deletion (repeatable)",
    )
    parser.add_argument(
        "--unprotect", action="append", default=[], metavar="TABLE",
        help=(
            "explicitly allow deletion of protected TABLE (repeatable). "
            "Alembic bookkeeping can never be unprotected."
        ),
    )
    parser.add_argument(
        "--clean-location-master", action="store_true",
        help=(
            f"also clean {LOCATION_TABLE}. Off by default. Every referencing table is "
            "analysed first, locations that kept data still needs are preserved, and "
            "the table is deleted last. Requires --execute plus a verified backup."
        ),
    )
    parser.add_argument(
        "--include-referenced-locations", action="store_true",
        help=(
            "with --clean-location-master, also delete locations that kept tables still "
            "reference. Off by default; those rows are preserved unless you opt in."
        ),
    )
    parser.add_argument(
        "--only-tables", action="append", default=[], metavar="TABLE",
        help=(
            "empty only TABLE and protect every other table, including tables that are "
            "normally cleanable. Repeatable. Use this to finish off a specific set of "
            "tables after the rest of the database has already been cleaned. A kept "
            "table that still holds rows pointing at a selected table stops the run "
            "and is reported by name. Cannot be combined with --protect, --unprotect "
            "or --clean-location-master."
        ),
    )
    parser.add_argument(
        "--include-alembic-version", action="store_true",
        help=(
            "allow public.alembic_version to be emptied when it is named with "
            "--only-tables. Off by default, and only valid together with --only-tables. "
            "The table and its schema are preserved; only the row recording the "
            "current revision is removed, so future migration commands will need "
            "careful recovery."
        ),
    )
    parser.add_argument(
        "--backup-dir", type=Path, default=REPO_ROOT / DEFAULT_BACKUP_DIRNAME,
        help="directory for timestamped backups (default: %(default)s)",
    )
    parser.add_argument(
        "--yes", action="store_true",
        help="skip the interactive confirmation for --execute (still backs up first)",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    mode = (
        "execute" if args.execute
        else "backup" if args.backup
        else "dry-run" if args.dry_run
        else "inspect"
    )
    database_url = resolve_database_url()
    backup_dir = args.backup_dir.expanduser().resolve()

    if args.include_referenced_locations and not args.clean_location_master:
        print(
            "ERROR: --include-referenced-locations only makes sense together with "
            "--clean-location-master.",
            file=sys.stderr,
        )
        return EXIT_ERROR

    if args.only_tables:
        conflicts = {
            "--unprotect": args.unprotect,
            "--protect": args.protect,
            "--clean-location-master": [args.clean_location_master] if args.clean_location_master else [],
        }
        for option, values in conflicts.items():
            if values:
                print(
                    f"ERROR: --only-tables selects the tables to empty by name and cannot be "
                    f"combined with {option}; they are two different selection mechanisms.",
                    file=sys.stderr,
                )
                return EXIT_ERROR

    conn = None
    try:
        conn = connect(database_url)
        plan = build_plan(
            conn,
            args.protect,
            args.unprotect,
            clean_location_master=args.clean_location_master,
            include_referenced_locations=args.include_referenced_locations,
            only_tables=args.only_tables,
            include_alembic_version=args.include_alembic_version,
        )
    except Exception as exc:  # noqa: BLE001 - surfaced to the operator
        print(f"ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        if conn is not None:
            conn.close()
        return EXIT_ERROR

    try:
        if args.execute:
            return run_execute(conn, plan, database_url, backup_dir, args.yes)
        if args.backup:
            return run_backup(plan, database_url, backup_dir)
        if args.dry_run:
            return run_dry_run(plan)
        return run_inspect(plan)
    except CleanupError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return EXIT_ERROR
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        return EXIT_ERROR
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
