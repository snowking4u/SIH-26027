"""STEP 11 master data generator: synthetic locations, assets, parameters.

All synthetic business identifiers use a deterministic ``SYN-*`` prefix and
every row with a free-text field carries the ``SYNTHETIC_STEP11`` marker so
marker-based cleanup never touches real master data.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asset import AssetMaster
from app.models.asset_parameter import AssetParameter
from app.models.location import LocationMaster
from app.models.source_system import SourceSystem

from . import random_utils as ru
from . import rail_reference as rr
from .config import MARKER, SyntheticConfig

ASSET_TYPES = [
    "TRACK",
    "SIGNAL",
    "OCS",
    "BRIDGE",
    "LEVEL_CROSSING",
    "TRACK_CIRCUIT",
    "POINT_MACHINE",
]

STATUSES = ["IN_SERVICE", "IN_SERVICE", "IN_SERVICE", "UNDER_MAINTENANCE"]

# Realistic per-type asset naming so Asset Master reads like a railway
# register rather than "Synthetic track 3".
ASSET_TYPE_LABEL = {
    "TRACK": "Track",
    "SIGNAL": "Signal",
    "OCS": "Overhead Contact System",
    "BRIDGE": "Bridge",
    "LEVEL_CROSSING": "Level Crossing",
    "TRACK_CIRCUIT": "Track Circuit",
    "POINT_MACHINE": "Point Machine",
}

PARAMETER_POOL = [
    ("RAIL_WEAR_MM", "Rail head wear", "mm"),
    ("TUBE_DEFLECTION_MM", "Tube deflection", "mm"),
    ("POINT_FRICTION_N", "Point friction force", "N"),
    ("SIGNAL_LAMP_LUX", "Signal lamp intensity", "lux"),
    ("CONTACT_WIRE_HT_MM", "Contact wire height", "mm"),
    ("BRIDGE_CRACK_WIDTH_MM", "Bridge crack width", "mm"),
]


@dataclass
class AssetInfo:
    id: int
    station_idx: int
    line_idx: int
    station_code: str
    line_number: str
    asset_type: str
    source_system_code: str
    installation_date: date
    status: str


# Station/line resolution now comes from the real Agra Division reference
# topology. These names are re-exported because sibling generators
# (``coa_generator``) import them from this module.
station_code = rr.station_code
line_number = rr.line_number


def asset_id(n: int) -> str:
    return f"SYN-ASSET-{n + 1:06d}"


class MasterGenerator:
    """Generate synthetic location_master, asset_master and asset_parameter."""

    PRIMARY_CHAIN = ["TMS", "TDMS", "SMMS"]

    def __init__(self, db: Session, cfg: SyntheticConfig):
        self.db = db
        self.cfg = cfg
        self.rng: random.Random = cfg.module_rng(0x1)

    # ------------------------------------------------------------------ #
    # Locations
    # ------------------------------------------------------------------ #
    def generate_locations(self) -> list[LocationMaster]:
        """Materialise the real Agra Division station/line topology.

        ``location_master`` has no remarks column, so idempotency is enforced
        on the ``(station_code, line_code)`` pair, which is the natural key of
        the table. Re-running skips pairs that already exist.
        """
        existing_pairs = {
            (station, line)
            for station, line in self.db.execute(
                select(LocationMaster.station_code, LocationMaster.line_code)
            ).all()
        }
        fresh: list[LocationMaster] = []
        for ref in rr.LOCATIONS:
            if (ref.station_code, ref.line_code) in existing_pairs:
                continue
            fresh.append(
                LocationMaster(
                    zone_code=rr.ZONE_CODE,
                    zone_name=rr.ZONE_NAME,
                    division_code=rr.DIVISION_CODE,
                    division_name=rr.DIVISION_NAME,
                    section_code=ref.section_code,
                    section_name=ref.section_name,
                    station_code=ref.station_code,
                    station_name=ref.station_name,
                    line_code=ref.line_code,
                    line_name=ref.line_name,
                    km_start=ref.km_start,
                    km_end=ref.km_end,
                    latitude=ref.latitude,
                    longitude=ref.longitude,
                )
            )
        if fresh:
            self.db.add_all(fresh)
            self.db.flush()
        return fresh

    # ------------------------------------------------------------------ #
    # Assets
    # ------------------------------------------------------------------ #
    def generate_assets(self, locations: list[LocationMaster]) -> list[AssetInfo]:
        cfg = self.cfg
        sources = self._source_systems()
        existing = {
            (ssid, asset_code)
            for ssid, asset_code in self.db.execute(
                select(
                    AssetMaster.source_system_id, AssetMaster.source_asset_id
                ).where(AssetMaster.source_asset_id.like("SYN-%"))
            ).all()
        }

        # Resolve (station, line) -> location id from the database rather than
        # indexing the freshly-inserted list. The fresh list omits rows that
        # already existed from an earlier run, so positional indexing would
        # attach assets to the wrong location on re-runs.
        location_ids = {
            (station, line): loc_id
            for station, line, loc_id in self.db.execute(
                select(
                    LocationMaster.station_code,
                    LocationMaster.line_code,
                    LocationMaster.id,
                )
            ).all()
        }
        combos = rr.station_line_combos()
        oos_types = [t for t in ASSET_TYPES if t != "OCS"]

        infos: list[AssetInfo] = []
        rows: list[AssetMaster] = []
        meta: list[tuple] = []
        count = 0
        for n in range(cfg.asset_count):
            source = sources[self.PRIMARY_CHAIN[n % len(self.PRIMARY_CHAIN)]]
            sid = asset_id(n)
            if (source.id, sid) in existing:
                count += 1
                continue
            station_idx, line_idx, scode, lcode = rr.combo_indices(n % len(combos))
            # The goods loop siding is not electrified, so OCS assets are only
            # placed on the running lines.
            type_pool = oos_types if lcode == "3RD-LINE" else ASSET_TYPES
            raw_type = type_pool[n % len(type_pool)]
            ins_date = ru.datetime_between(
                self.rng,
                datetime(cfg.start_date.year - 20, 1, 1),
                datetime(cfg.start_date.year - 1, 12, 31),
                minute_step=1440,
            ).date()
            status = STATUSES[n % len(STATUSES)]
            km = self._station_km(scode, lcode)
            asset = AssetMaster(
                source_system_id=source.id,
                source_asset_id=sid,
                asset_type=raw_type,
                asset_subtype=f"{raw_type}-STD",
                asset_name=(
                    f"{rr.station_name_for(scode)} {ASSET_TYPE_LABEL[raw_type]} "
                    f"{raw_type[:2]}-{n + 1:03d} (KM {km})"
                ),
                location_id=location_ids.get((scode, lcode)),
                installation_date=ins_date,
                status=status,
                remarks=(
                    f"{MARKER} Master asset; source={source.system_code} "
                    f"station={scode} line={lcode}."
                ),
            )
            rows.append(asset)
            meta.append((station_idx, line_idx, raw_type, source.system_code, ins_date, status))
            count += 1
            if count % cfg.batch_size == 0:
                infos.extend(self._flush_asset_batch(rows, meta))
        if rows:
            infos.extend(self._flush_asset_batch(rows, meta))
        return infos

    def _station_km(self, station_code: str, line_code: str) -> str:
        """Kilometre label for an asset name, from the reference topology."""
        for ref in rr.LOCATIONS:
            if ref.station_code == station_code and ref.line_code == line_code:
                return f"{ref.km_midpoint:.1f}"
        return "-"

    def _flush_asset_batch(
        self, rows: list[AssetMaster], meta: list[tuple]
    ) -> list[AssetInfo]:
        # Flush assigns primary keys; AssetInfo requires a real asset id.
        self.db.add_all(rows)
        self.db.flush()
        infos: list[AssetInfo] = []
        while rows:
            asset = rows.pop(0)
            station, line, raw_type, sys_code, ins_date, status = meta.pop(0)
            infos.append(
                AssetInfo(
                    id=asset.id,
                    station_idx=station,
                    line_idx=line,
                    station_code=station_code(station),
                    line_number=line_number(station, line),
                    asset_type=raw_type,
                    source_system_code=sys_code,
                    installation_date=ins_date,
                    status=status,
                )
            )
        return infos

    def generate_parameters(self, infos: list[AssetInfo]) -> int:
        cfg = self.cfg
        sources = self._source_systems()
        rows: list[AssetParameter] = []
        count = 0
        for info in infos:
            if ru.rand_boolean(self.rng, probability=0.6):
                continue
            code, name, unit = PARAMETER_POOL[info.station_idx % len(PARAMETER_POOL)]
            recorded = datetime.combine(info.installation_date, time(0, 0)) + timedelta(
                days=self.rng.randrange(0, 400)
            )
            rows.append(
                AssetParameter(
                    asset_id=info.id,
                    source_system_id=sources[info.source_system_code].id,
                    parameter_code=code,
                    parameter_name=name,
                    parameter_value=ru.int_between(self.rng, 2, 40),
                    unit=unit,
                    recorded_date=recorded,
                )
            )
            count += 1
            if count % cfg.batch_size == 0:
                self.db.flush()
        if rows:
            self.db.add_all(rows)
            self.db.flush()
        return count

    def generate(self) -> dict:
        locations = self.generate_locations()
        infos = self.generate_assets(locations)
        param_count = self.generate_parameters(infos)
        return {
            "locations": len(locations),
            "assets": len(infos),
            "asset_parameters": param_count,
        }

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _source_systems(self) -> dict[str, SourceSystem]:
        rows = self.db.scalars(
            select(SourceSystem).where(
                SourceSystem.system_code.in_(["TMS", "TDMS", "SMMS"])
            )
        ).all()
        if len(rows) != 3:
            raise RuntimeError(
                "STEP 11 requires TMS/TDMS/SMMS source systems; run "
                "scripts/seed_master_data.py first."
            )
        return {row.system_code: row for row in rows}