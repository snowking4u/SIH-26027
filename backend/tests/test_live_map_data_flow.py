"""Live Map data-flow contract tests (SIH 26027).

The Live Map is allowed to draw exactly two kinds of records:

- station nodes grouped from ``GET /api/locations`` (the ``location_master``
  network registry), and
- train markers derived from ``GET /api/coa/trains`` joined with the latest
  recorded ``GET /api/coa/movements`` row per train.

Nothing else may appear. These tests lock in both rendering states:

1. Empty database -> every Live Map endpoint returns ``[]``, so no station
   node and no train marker can be derived. No train is fabricated.
2. Populated synthetic dataset -> every derivable train marker maps to a real
   train row and a real movement row recorded at a registered station, and the
   API count matches the database count exactly.

The tests use the shared in-memory SQLite harness (``client`` + ``db_session``),
so they never touch a live PostgreSQL database.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import func, select

from app.models.location import LocationMaster
from app.models.source_system import SourceSystem
from app.models.train import Train
from app.models.train_movement import TrainMovement
from app.services.synthetic_data import SyntheticConfig, run_pipeline

# Endpoints the Live Map calls on mount (frontend/src/pages/live-map).
LIVE_MAP_ENDPOINTS = (
    "/api/locations",
    "/api/coa/trains",
    "/api/coa/movements",
    "/api/coa/schedules",
    "/api/coa/line-occupancy",
    "/api/coa/available-windows",
)

SOURCE_CODES = ("TMS", "TDMS", "SMMS", "COA")


def tiny_cfg() -> SyntheticConfig:
    """Same deterministic tiny configuration used by the STEP 11 test suite."""
    return SyntheticConfig(
        seed=42,
        scale="tiny",
        days=7,
        start_date=date(2026, 1, 5),
        scenario="normal",
        batch_size=10,
        write_manifest=False,
    )


def seed_source_systems(db) -> None:
    db.add_all(
        [
            SourceSystem(system_code=code, system_name=f"Test {code}")
            for code in SOURCE_CODES
        ]
    )
    db.commit()


def derive_latest_movement_per_train(movements: list[dict]) -> dict[int, dict]:
    """Exact latest-movement-per-train join performed by the Live Map page."""
    latest: dict[int, dict] = {}
    for movement in movements:
        current = latest.get(movement["train_id"])
        if (
            current is None
            or movement["movement_datetime"] > current["movement_datetime"]
        ):
            latest[movement["train_id"]] = movement
    return latest


# --------------------------------------------------------------------------- #
# 1. Empty database -> honest empty state, zero fabricated markers
# --------------------------------------------------------------------------- #
def test_live_map_endpoints_empty_database_return_empty_lists(client):
    for path in LIVE_MAP_ENDPOINTS:
        response = client.get(path)
        assert response.status_code == 200, path
        assert response.json() == [], path


def test_live_map_derives_zero_train_markers_when_database_empty(client):
    trains = client.get("/api/coa/trains").json()
    movements = client.get("/api/coa/movements").json()
    locations = client.get("/api/locations").json()
    assert trains == []
    assert movements == []
    assert locations == []

    latest = derive_latest_movement_per_train(movements)
    station_codes = {row["station_code"] for row in locations if row["station_code"]}
    markers = [
        movement
        for movement in latest.values()
        if movement["station_code"] in station_codes
    ]
    assert markers == []


def test_trains_without_recorded_movements_produce_no_markers(client):
    """A train row alone must never become a map marker (it has no position)."""
    source = client.post(
        "/api/source-systems",
        json={
            "system_code": "COA",
            "system_name": "COA",
            "description": "TEST/SYNTHETIC COA source for the Live Map contract.",
        },
    )
    assert source.status_code == 201

    train = client.post(
        "/api/coa/trains",
        json={
            "train_id": "LIVEMAP-TRN-001",
            "train_number": "LIVEMAP-1",
            "train_name": "TEST/SYNTHETIC Live Map train",
            "schedule_date": "2026-03-01T00:00:00",
            "start_date": "2026-03-01T00:00:00",
            "loco_number": "LOCO-LM",
            "direction": "UP",
            "source_system_id": source.json()["id"],
        },
    )
    assert train.status_code == 201

    trains = client.get("/api/coa/trains").json()
    assert len(trains) == 1
    movements = client.get("/api/coa/movements").json()
    assert movements == []
    assert derive_latest_movement_per_train(movements) == {}


# --------------------------------------------------------------------------- #
# 2. Populated synthetic dataset -> only real API rows are derivable
# --------------------------------------------------------------------------- #
def test_live_map_populated_synthetic_yields_only_real_rows(client, db_session):
    seed_source_systems(db_session)
    run_pipeline(db_session, tiny_cfg())

    trains = client.get("/api/coa/trains?limit=1000").json()
    movements = client.get("/api/coa/movements?limit=1000").json()
    locations = client.get("/api/locations?limit=500").json()

    db_train_count = db_session.scalar(select(func.count()).select_from(Train))
    db_movement_count = db_session.scalar(
        select(func.count()).select_from(TrainMovement)
    )
    db_location_count = db_session.scalar(
        select(func.count()).select_from(LocationMaster)
    )

    # The API returns exactly what the database holds — nothing invented.
    assert len(trains) == db_train_count > 0
    assert len(movements) == db_movement_count > 0
    assert len(locations) == db_location_count > 0

    # Every derivable marker maps to a real train row ...
    train_ids = {train["id"] for train in trains}
    assert all(movement["train_id"] in train_ids for movement in movements)

    # ... recorded at a station that exists in the network registry.
    station_codes = {row["station_code"] for row in locations if row["station_code"]}
    latest = derive_latest_movement_per_train(movements)
    markers = [
        movement
        for movement in latest.values()
        if movement["station_code"] in station_codes
    ]
    assert markers, "populated synthetic data must yield mappable train markers"


def test_live_map_empty_after_cleanup_returns_to_honest_empty_state(client, db_session):
    """Generate -> rows exist -> clean up -> the Live Map endpoints are empty again."""
    from app.services.synthetic_data import cleanup_synthetic

    seed_source_systems(db_session)
    run_pipeline(db_session, tiny_cfg())
    assert client.get("/api/coa/trains?limit=1000").json() != []

    cleanup_synthetic(db_session)

    assert client.get("/api/coa/trains").json() == []
    assert client.get("/api/coa/movements").json() == []
    assert client.get("/api/locations").json() == []

