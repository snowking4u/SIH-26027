"""Isolated test harness for the reusable database cleanup tool.

Every test runs against a *throwaway* PostgreSQL database that this module
creates, seeds and drops. The application's own database is never connected to,
read from, or modified by the test suite: the only thing taken from the real
configuration is the credential/host needed to open a maintenance connection,
and the test database always has a different name.
"""

from __future__ import annotations

import re
import sys
import uuid
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import psycopg2
import pytest
from psycopg2 import sql as pg_sql
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from scripts import db_cleanup_tool as tool

TEST_DB_PREFIX = "railflow_cleanup_test_"
MAINTENANCE_DB = "postgres"

# Column overrides that satisfy CHECK constraints or express intent clearly.
COLUMN_OVERRIDES: dict[tuple[str, str], object] = {
    ("block_plan_task", "planned_start"): "2026-01-01 00:00:00",
    ("block_plan_task", "planned_end"): "2026-01-01 01:00:00",
    ("block_plan_task", "planned_duration_minutes"): 30,
    ("candidate_block_window", "candidate_start"): "2026-01-01 00:00:00",
    ("candidate_block_window", "candidate_end"): "2026-01-01 01:00:00",
    ("candidate_block_window", "candidate_duration_minutes"): 30,
    ("planning_priority", "defect_age_days"): 1,
    ("planning_priority", "priority_score"): 50,
    ("task_dependency", "lag_minutes"): 0,
}

# Tables that need more than one row so that UNIQUE/CHECK constraints and
# multi-row delete counting are genuinely exercised.
#
# location_master deliberately gets three rows while only the first is
# referenced by asset_master, so the tool has to tell referenced and unreferenced
# locations apart.
ROWS_PER_TABLE: dict[str, int] = {
    "maintenance_requirement": 2,
    "planning_task": 2,
    "asset_parameter": 3,
    "defect_failure": 2,
    "location_master": 3,
}

# Every location_master column is nullable, so the generic seeder would leave the
# table blank. These columns carry realistic, distinct values, giving the location
# cleanup analysis real codes to match against.
EXTRA_COLUMNS: dict[str, tuple[str, ...]] = {
    "location_master": (
        "zone_code",
        "section_code",
        "station_code",
        "station_name",
        "line_code",
        "line_name",
    ),
}
EXTRA_VALUES: dict[str, list[str]] = {
    "zone_code": ["NCR", "NCR", "NCR"],
    "section_code": ["AGC-MTJ", "AGC-MTJ", "AGC-BHA"],
    "station_code": ["AGC", "MTJ", "BHA"],
    "station_name": ["Agra Cantt", "Mathura Jn", "Bhandai Jn"],
    "line_code": ["UP-MAIN", "DOWN-MAIN", "3RD-LINE"],
    "line_name": ["UP Main Line", "DOWN Main Line", "Goods Siding Line"],
}

# Nullable foreign keys that still carry meaning. The generic seeder only fills
# NOT NULL columns, which would leave asset_master.location_id empty and stop the
# tool from ever seeing a referenced location, so they are filled explicitly.
NULLABLE_FK_COLUMNS: dict[str, tuple[str, ...]] = {
    "asset_master": ("location_id",),
}

ALEMBIC_VERSION = "f6a0c3e8d2b9"


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _configured_parts() -> dict:
    """Connection details from the app config, minus the database name."""
    parsed = make_url(tool.resolve_database_url())
    return {
        "user": parsed.username,
        "password": parsed.password or "",
        "host": parsed.host or "localhost",
        "port": parsed.port or 5432,
    }


def _maintenance_connection():
    parts = _configured_parts()
    return psycopg2.connect(
        host=parts["host"], port=parts["port"], user=parts["user"],
        password=parts["password"], dbname=MAINTENANCE_DB,
    )


def _test_database_url(dbname: str) -> str:
    parts = _configured_parts()
    return (
        f"postgresql+psycopg2://{parts['user']}:{parts['password']}"
        f"@{parts['host']}:{parts['port']}/{dbname}"
    )


def _value_for_type(data_type: str, table: str, column: str, index: int):
    if (table, column) in COLUMN_OVERRIDES:
        return COLUMN_OVERRIDES[(table, column)]
    if data_type in ("integer", "bigint", "smallint"):
        return index
    if data_type in ("double precision", "numeric", "real"):
        return 1.0
    if data_type == "boolean":
        return False
    if data_type == "date":
        return "2026-01-01"
    if "timestamp" in data_type:
        return "2026-01-01 00:00:00"
    if data_type in ("json", "jsonb"):
        return "{}"
    if data_type.split("(")[0].strip() in (
        "character varying", "text", "character", "uuid"
    ):
        return _text_value(table, column, index, _max_length(data_type))
    return f"TEST-{table}-{column}-{index}"


def _max_length(data_type: str) -> int | None:
    """Declared width for ``character varying(N)``; ``None`` when unlimited."""
    match = re.fullmatch(r"character varying\((\d+)\)", data_type)
    return int(match.group(1)) if match else None


def _text_value(table: str, column: str, index: int, max_length: int | None) -> str:
    token = f"TEST-{table}-{column}-{index}"
    if max_length is None or len(token) <= max_length:
        return token
    # keep the row index in the tail so values stay distinct where possible
    compact = f"{table}_{column}_{index}"
    return compact[-max_length:] if max_length >= len(str(index)) else compact[:max_length]


def _required_columns(cur, table: str) -> list[tuple[str, str]]:
    """NOT NULL columns without a default, excluding identity/serial columns."""
    cur.execute(
        """
        SELECT a.attname, format_type(a.atttypid, a.atttypmod)
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = %s
          AND a.attnum > 0 AND NOT a.attisdropped
          AND a.attnotnull
          AND a.attidentity = ''
          AND NOT EXISTS (
              SELECT 1 FROM pg_attrdef d
              WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum
          )
          AND a.attname <> 'id'
        ORDER BY a.attnum
        """,
        (table,),
    )
    return cur.fetchall()


def _foreign_key_columns(cur, table: str) -> dict[str, tuple[str, str]]:
    cur.execute(
        """
        SELECT a.attname, pc.relname, pa.attname
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_class pc ON pc.oid = con.confrelid
        JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
        JOIN pg_attribute pa ON pa.attrelid = con.confrelid AND pa.attnum = con.confkey[1]
        WHERE con.contype = 'f' AND n.nspname = 'public' AND c.relname = %s
        """,
        (table,),
    )
    return {row[0]: (row[1], row[2]) for row in cur.fetchall()}


def _all_tables(cur) -> list[str]:
    cur.execute(
        "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
        "WHERE c.relkind = 'r' AND n.nspname = 'public' ORDER BY 1"
    )
    return [r[0] for r in cur.fetchall()]


def seed_database(conn) -> dict[str, int]:
    """Insert one coherent row into every table, honouring real FK dependencies.

    Rows are inserted parents-first using the reverse of the cleanup tool's own
    delete ordering, so the fixture exercises the same dependency graph the
    tool has to reason about.
    """
    with conn.cursor() as cur:
        plan = tool.build_plan(conn)
        # Order *every* table children-first with the tool's own dependency
        # analysis, then reverse it, to get a valid parents-first insert order.
        full_order, _ = tool.order_children_first(plan.relations, plan.foreign_keys)
        insert_order = [rel.name for rel in reversed(full_order)]

        ids: dict[str, list[int]] = {}
        next_id = 9000
        for table in insert_order:
            if table == "alembic_version":
                continue
            required = _required_columns(cur, table)
            fk_columns = _foreign_key_columns(cur, table)
            nullable_fks = [
                column for column in NULLABLE_FK_COLUMNS.get(table, ()) if column in fk_columns
            ]
            count = ROWS_PER_TABLE.get(table, 1)
            table_ids: list[int] = []
            # One cursor per parent table for the whole insert, so every FK slot
            # (and every row) draws a different parent row. That keeps
            # "predecessor != successor" and UNIQUE(fk, ...) constraints happy.
            parent_uses: dict[str, int] = {}
            for index in range(1, count + 1):
                next_id += 1
                table_ids.append(next_id)
                columns = ["id"]
                values: list[object] = [next_id]
                for column, data_type in required:
                    if column in fk_columns:
                        parent_table, parent_column = fk_columns[column]
                        parent_ids = ids.get(parent_table) or []
                        if not parent_ids:
                            cur.execute(
                                pg_sql.SQL("SELECT {} FROM public.{} LIMIT 1").format(
                                    pg_sql.Identifier(parent_column),
                                    pg_sql.Identifier(parent_table),
                                )
                            )
                            row = cur.fetchone()
                            if row is None:
                                raise AssertionError(
                                    f"cannot seed {table}.{column}: parent table "
                                    f"{parent_table} has no rows to reference"
                                )
                            values.append(row[0])
                        else:
                            used = parent_uses.get(parent_table, 0)
                            values.append(parent_ids[min(used, len(parent_ids) - 1)])
                            parent_uses[parent_table] = used + 1
                    else:
                        values.append(_value_for_type(data_type, table, column, index))
                    columns.append(column)
                for column in EXTRA_COLUMNS.get(table, ()):
                    values.append(EXTRA_VALUES[column][index - 1])
                    columns.append(column)
                for column in nullable_fks:
                    parent_table = fk_columns[column][0]
                    parent_ids = ids.get(parent_table) or []
                    if not parent_ids:
                        raise AssertionError(
                            f"cannot seed {table}.{column}: parent table "
                            f"{parent_table} has no rows to reference"
                        )
                    used = parent_uses.get(parent_table, 0)
                    values.append(parent_ids[min(used, len(parent_ids) - 1)])
                    parent_uses[parent_table] = used + 1
                    columns.append(column)
                statement = pg_sql.SQL("INSERT INTO public.{} ({}) VALUES ({})").format(
                    pg_sql.Identifier(table),
                    pg_sql.SQL(", ").join(pg_sql.Identifier(c) for c in columns),
                    pg_sql.SQL(", ").join(pg_sql.Placeholder() * len(columns)),
                )
                cur.execute(statement, values)
            ids[table] = table_ids
        conn.commit()

        counts = {t: 0 for t in _all_tables(cur)}
        for table, total in counts.items():
            cur.execute(
                pg_sql.SQL("SELECT count(*) FROM public.{}").format(pg_sql.Identifier(table))
            )
            counts[table] = cur.fetchone()[0]
    return counts


def truncate_all(conn) -> None:
    """Reset every data table between tests (test harness only, never the tool).

    ``alembic_version`` is deliberately left alone so migration bookkeeping is
    present in every test; the row is re-inserted when a previous test emptied
    it on purpose, so each test starts from the same migration state.
    """
    conn.autocommit = True
    with conn.cursor() as cur:
        tables = [t for t in _all_tables(cur) if t not in tool.MIGRATION_TABLES]
        cur.execute(
            "TRUNCATE TABLE " + ", ".join(f'public."{t}"' for t in tables)
            + " RESTART IDENTITY CASCADE"
        )
        cur.execute(
            "INSERT INTO public.alembic_version (version_num) "
            "SELECT %(v)s WHERE NOT EXISTS (SELECT 1 FROM public.alembic_version)",
            {"v": ALEMBIC_VERSION},
        )


def clear_except_tables(conn, keep: set[str]) -> None:
    """Empty every table except ``keep`` (test harness only, never the tool).

    Reproduces "the rest of the database has already been cleaned" so a targeted
    run can be exercised end to end. Only the referencing tables lose rows, so no
    cascade can fire into a kept table; the remaining deletes follow the tool's
    own children-first order. ``TRUNCATE ... CASCADE`` is unusable here:
    truncating a child of a kept table drags that kept table in with it.
    """
    conn.autocommit = False
    with conn.cursor() as cur:
        relations = tool.discover_relations(cur)
        foreign_keys = tool.discover_foreign_keys(cur)
        order, _ = tool.order_children_first(relations, foreign_keys)
        for rel in order:
            if rel.name in keep:
                continue
            cur.execute(
                pg_sql.SQL("DELETE FROM public.{}").format(pg_sql.Identifier(rel.name))
            )
    conn.commit()
    conn.autocommit = True



# --------------------------------------------------------------------------- #
# fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def test_db_name() -> str:
    return f"{TEST_DB_PREFIX}{uuid.uuid4().hex[:12]}"


@pytest.fixture(scope="session")
def postgres_available() -> None:
    try:
        conn = _maintenance_connection()
    except psycopg2.Error as exc:
        pytest.skip(f"PostgreSQL not reachable for isolated tests: {exc}")
    conn.close()
    if tool.find_pg_tool("pg_dump") is None:
        pytest.skip("pg_dump not available; isolated backup tests cannot run")


@pytest.fixture(scope="session")
def isolated_database(postgres_available, test_db_name):
    """Create an empty throwaway database with the application's schema."""
    admin = _maintenance_connection()
    admin.autocommit = True
    with admin.cursor() as cur:
        cur.execute(
            pg_sql.SQL("CREATE DATABASE {} TEMPLATE template0 ENCODING 'UTF8'").format(
                pg_sql.Identifier(test_db_name)
            )
        )
    admin.close()

    try:
        url = _test_database_url(test_db_name)
        from app.core.database import Base  # noqa: PLC0415 - needs sys.path set above
        from app import models  # noqa: F401, PLC0415 - registers every table

        engine = create_engine(url.replace("postgresql+psycopg2", "postgresql"))
        try:
            Base.metadata.create_all(bind=engine)
            with engine.begin() as conn:
                # Alembic bookkeeping is managed by migrations, not by ORM metadata.
                conn.execute(
                    text(
                        "CREATE TABLE public.alembic_version "
                        "(version_num character varying(32) NOT NULL, "
                        "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
                    )
                )
                conn.execute(
                    text("INSERT INTO public.alembic_version (version_num) VALUES (:v)"),
                    {"v": ALEMBIC_VERSION},
                )
        finally:
            engine.dispose()
        yield url
    finally:
        # always tear the scratch database down, even if setup failed
        admin = _maintenance_connection()
        admin.autocommit = True
        with admin.cursor() as cur:
            cur.execute(
                pg_sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(
                    pg_sql.Identifier(test_db_name)
                )
            )
        admin.close()


@pytest.fixture()
def db_url(isolated_database, monkeypatch) -> str:
    """Point the cleanup tool at the isolated database, never the real one."""
    monkeypatch.setattr(tool, "resolve_database_url", lambda: isolated_database)
    return isolated_database


@pytest.fixture()
def seeded_db(db_url):
    """A freshly seeded isolated database for one test."""
    conn = tool.connect(db_url)
    truncate_all(conn)
    counts = seed_database(conn)
    conn.close()
    return db_url, counts


@pytest.fixture()
def backup_dir(tmp_path) -> Path:
    target = tmp_path / "backups"
    target.mkdir(parents=True, exist_ok=True)
    return target


def snapshot_counts(db_url: str) -> dict[str, int]:
    conn = tool.connect(db_url)
    try:
        counts: dict[str, int] = {}
        with conn.cursor() as cur:
            for table in _all_tables(cur):
                cur.execute(
                    pg_sql.SQL("SELECT count(*) FROM public.{}").format(
                        pg_sql.Identifier(table)
                    )
                )
                counts[table] = cur.fetchone()[0]
        return counts
    finally:
        conn.close()
