# Database Cleanup Tool

`scripts/db_cleanup_tool.py` clears RAILFLOW AI **application data** from PostgreSQL so
synthetic/demo datasets can be regenerated from a clean slate, while leaving the
database **structure completely untouched**.

Run it from the `backend` directory:

```bash
cd backend
python scripts/db_cleanup_tool.py --help
```

## What it does and does not do

| Does | Does not |
| --- | --- |
| Discover tables and foreign keys dynamically from `pg_catalog` | Hardcode a table list |
| `DELETE` rows in dependency-aware order, in one transaction | `DROP` / `ALTER` / `CREATE` anything |
| Back up with `pg_dump` and verify before deleting | `TRUNCATE ... CASCADE` or disable FK checks |
| Preserve schema, constraints, indexes, sequences | Reset sequences or identity counters |
| Preserve curated reference data by default | Empty `alembic_version` unless you pass **both** `--only-tables` and `--include-alembic-version` |
| Report a kept table that still blocks a target, then stop | Force a delete by cascading or by editing another table |
| Roll back everything if any delete fails | Silently skip a table that failed |

## Modes

Exactly one mode runs per invocation. **Inspection is the default**, and nothing is ever
deleted without `--execute`.

| Mode | Effect |
| --- | --- |
| *(no flag)* / `--inspect` | Lists tables, row counts, foreign keys, self-references and protected tables. Read-only. |
| `--dry-run` | Prints the exact delete order and row count per table. Read-only. |
| `--backup` | Creates and verifies a `pg_dump` archive. Deletes nothing. |
| `--execute` | Backs up, verifies, asks for confirmation, then deletes in one transaction. |

```bash
python scripts/db_cleanup_tool.py                    # inspect (default)
python scripts/db_cleanup_tool.py --dry-run          # what would be deleted
python scripts/db_cleanup_tool.py --backup           # backup only
python scripts/db_cleanup_tool.py --execute          # destructive, prompts for confirmation
```

## Protected tables

Protected by default — never deleted:

* `source_system`
* `location_master` (see "Location master" below)
* `planning_resource`
* `asset_master`
* `alembic_version` (Alembic bookkeeping; cannot be unprotected)
* every PostgreSQL system schema (`pg_*`, `information_schema`)

Curated reference data is never removed automatically. Changing the protected set is an
explicit, named action:

```bash
# protect extra tables (repeatable)
python scripts/db_cleanup_tool.py --dry-run --protect some_table

# allow deletion of a protected table (repeatable, deliberate)
python scripts/db_cleanup_tool.py --dry-run --unprotect asset_master
```

The tool refuses an `--unprotect` that would orphan a still-protected table. For example
`asset_master` and `planning_resource` are children of `source_system`, so clearing
`source_system` requires naming all three:

```bash
python scripts/db_cleanup_tool.py --dry-run \
    --unprotect source_system --unprotect asset_master --unprotect planning_resource
```

`--unprotect location_master` on its own is refused, because `asset_master` is a child of
it. Use `--clean-location-master` instead — it analyses the dependencies first.

## Location master

`location_master` is skipped by default. It holds the zone/division/section/station/line
reference data, so removing it is a separate, deliberate decision:

```bash
# what would happen (read-only)
python scripts/db_cleanup_tool.py --dry-run --clean-location-master

# do it (backed up + confirmed, like any other cleanup)
python scripts/db_cleanup_tool.py --execute --clean-location-master
```

With the flag the tool:

1. Reads every `location_master` row and builds a code index from its *identity*
   columns (`station_code`, `line_code`). Zone, division and section codes are
   deliberately excluded: they describe a *group* of locations, so matching on them
   would mark every location in that group as "in use" and silently turn the
   cleanup into a no-op.
2. Walks **every foreign key that points at `location_master`** and counts, per location
   row, how many rows of each referencing table still use it — reporting the constraint
   name, its `ON DELETE` rule, the row count and sample row ids.
3. Also spots **plain-text references** (a `station_code` / `location_code` column holding
   a location's code with no foreign key behind it), so protected reference data that
   points at a location by code is also honoured.
4. **Preserves** every location that kept data still needs, and deletes only the
   unreferenced rows, by primary key.
5. Deletes `location_master` **last**, after every table that references it, so the
   ordering is always dependency-safe. No cascading deletes, no disabled constraints.
6. Verifies before committing that the surviving ids are exactly the preserved set and
   that no protected table's location references changed, value by value.

The table itself is never altered: structure, primary key, sequence, foreign keys,
constraints, indexes and relationships are verified identical before and after.

### Removing locations that are still referenced

Deleting a location that `asset_master` points at would set `asset_master.location_id`
to `NULL` (the constraint's own `ON DELETE SET NULL` rule). That is a second, explicit
opt-in, and the report lists every record that would be unlinked:

```bash
python scripts/db_cleanup_tool.py --dry-run --clean-location-master \
    --include-referenced-locations
```

`--include-referenced-locations` is rejected unless `--clean-location-master` is also
given, so it can never take effect by accident.

## Targeted runs (`--only-tables`)

`--only-tables` empties **only the tables you name** and protects every other table,
including tables that are normally cleanable. It is the right tool when the broad
cleanup has already run and a specific set of tables still holds data:

```bash
# review first - read-only
python scripts/db_cleanup_tool.py --dry-run \
    --only-tables asset_master --only-tables planning_resource --only-tables source_system

# then do it (backup + confirmation, same as any other cleanup)
python scripts/db_cleanup_tool.py --execute \
    --only-tables asset_master --only-tables planning_resource --only-tables source_system
```

`--only-tables` is repeatable, and it is a different selection mechanism from
`--unprotect`: it cannot be combined with `--protect`, `--unprotect` or
`--clean-location-master`, and `location_master` must still go through
`--clean-location-master`.

For every selected table the report lists **all** of its foreign keys, resolved against
the real row counts, and labels each one:

| Label | Meaning |
| --- | --- |
| `emptied earlier in this same run` | the referencing table is also selected, so ordering already handles it |
| `already empty, does not block` | the referencing table holds no rows |
| `BLOCKS THIS RUN` | the referencing table is being kept and still holds rows |

### When a kept table still points at a target

If a table that is **not** selected still holds rows that reference a selected table,
the delete is not safe: the only ways to force it would be to delete rows the operator
did not ask to delete, or to lean on a cascading rule. The tool does neither. It stops,
and names the exact referencing table and constraint:

```
BLOCKING FOREIGN KEY DEPENDENCIES - DELETION IS NOT SAFE
  public.asset_master is referenced by public.asset_parameter holds 3 row(s)
  referencing public.asset_master via [fk_asset_parameter_asset_id] (ON DELETE RESTRICT)
  referencing table(s): public.asset_parameter
  those rows are left untouched. Empty them in a separate, explicitly confirmed run,
  or re-run this cleanup naming those tables too.
```

No backup is taken and no delete is attempted in that case. The same check runs again
*inside* the transaction, so rows that appear after the plan was built still stop the
run. Every `ON DELETE` rule counts as blocking, a cascading one included.

## Alembic migration bookkeeping

`alembic_version` is protected in every mode and is never emptied by a default cleanup.
Targeting it needs **two** explicit flags, so it can never happen by accident:

```bash
python scripts/db_cleanup_tool.py --dry-run \
    --only-tables alembic_version --include-alembic-version
```

* `--include-alembic-version` is rejected without `--only-tables`, so a blanket cleanup
  can never wipe migration history.
* Naming `alembic_version` without `--include-alembic-version` is refused.
* `--only-tables alembic_version` alone is refused: at least one real table must be named.

The table is preserved exactly — column, primary key, constraints and every migration
script in `backend/alembic/versions/`. Only the single row recording the current
revision is removed. No migration is run, and no migration history is regenerated,
rewritten or stamped. The dry run and the final report both carry a warning that:

* Alembic will now report the database as being at no revision, and `alembic upgrade
  head` will try to re-apply every migration from the base revision onwards. Guarded
  migrations become no-ops; an unguarded one can fail.
* Recovery is a single insert, using the revision id the database was built at:

```sql
INSERT INTO public.alembic_version (version_num) VALUES ('<head-revision>');
```

## Safety checks performed by `--execute`

1. Refuses system databases (`postgres`, `template0`, `template1`, `pg_*`) and read-only standbys.
2. Builds a children-first delete order and aborts on any cross-table FK cycle.
3. Aborts if a protected table is a child of a table scheduled for deletion. In a
   targeted run this is decided per row instead: a kept table that still holds rows
   pointing at a target is a blocker and is reported by name.
4. Creates a timestamped `pg_dump` backup; **never overwrites** an existing archive.
5. Verifies the backup: non-empty, `pg_restore --list` parses, table-data entries present.
   Aborts if verification fails.
6. Requires confirmation — type the database name, or pass `--yes` non-interactively.
7. Runs every `DELETE` in one transaction and verifies, before committing:
   no blocking references appeared, deleted row count matches the plan, all targets
   empty, protected counts unchanged, sequence values unchanged, Alembic state as
   expected, object inventory unchanged.
8. Rolls back the whole transaction on any failure.
9. After commit, re-fingerprints the schema with `pg_dump --schema-only` and reports
   whether it is identical, then re-reads the row counts so success is only claimed
   when PostgreSQL itself reports zero rows in every selected table.

Sequences are deliberately left alone: after a cleanup, the next inserted row gets a
higher id rather than restarting at 1.

## Options

```
--inspect                 list tables, row counts, foreign keys, protected tables (default)
--dry-run                 show which tables/rows would be deleted; changes nothing
--backup                  create and verify a pg_dump backup; deletes nothing
--execute                 perform the cleanup (backup + confirmation required)
--protect TABLE           additionally protect TABLE (repeatable)
--unprotect TABLE         explicitly allow deleting protected TABLE (repeatable)
--clean-location-master   also clean location_master (off by default)
--include-referenced-locations
                         with --clean-location-master, also delete locations that
                         kept tables still reference (off by default)
--only-tables TABLE       empty only TABLE and protect everything else (repeatable);
                         cannot be combined with --protect/--unprotect/
                         --clean-location-master
--include-alembic-version  allow alembic_version to be emptied when it is named with
                         --only-tables (off by default; needs --only-tables)
--backup-dir PATH         backup directory (default: <repo>/backups)
--yes                     skip the interactive confirmation for --execute
```

Exit codes: `0` success, `1` error or failed cleanup, `2` aborted by the operator.

## Restore a backup

The tool never restores anything automatically. To restore manually:

```bash
pg_restore -h localhost -p 5432 -U postgres -d sih_26027 --clean --if-exists \
  "backups/sih_26027_pre_cleanup_20260101_120000.dump"
```

## Tests

The test suite never touches the application database. It creates a throwaway database
named `railflow_cleanup_test_<random>`, builds the schema from the ORM models, seeds a
coherent dataset, and drops the database afterwards.

```bash
cd backend
python -m pytest tests/test_db_cleanup_tool.py -q
```

Covered: dry-run deletes nothing, foreign-key ordering, protected tables untouched,
failed deletion rolls back, backup failure blocks execution, backups are never
overwritten, schema/relationships/sequences unchanged, system-database refusal, and a
static check that the tool contains no DDL or dangerous SQL.

Location coverage: skipped and protected by default, the dry-run report naming every
affected row and its dependents, referenced locations preserved, delete ordering
(location table last), text-code references honoured, the two-opt-in rule for
`--include-referenced-locations`, confirmation and verified-backup requirements,
rollback on a failed location delete, and full structural survival.

Targeted-run coverage: exactly the named tables are targeted, `source_system` is ordered
after its children, the dry run reports every foreign key with its real row counts, a
populated referencing table blocks the run and is named (with nothing deleted and no
backup taken), the blocker check is repeated inside the transaction, the two-opt-in rule
for `alembic_version`, `location_master` never being touched, the `alembic_version`
table and its definition surviving while the migration scripts are never modified,
sequences and relationships surviving, before/after row counts, the verified backup, and
the confirmation requirement.

Tests skip automatically if PostgreSQL or `pg_dump` is unavailable.
