"""Real-world railway reference data: Agra Division (AGC), North Central Railway.

Scope and provenance
--------------------
Everything in this module is **public, non-sensitive railway reference data**:
station codes, station names, kilometre posts, section/line topology and train
service identities. It contains no passenger records, no staff data, no
schedules beyond published train identities, and no credentials.

The dataset this module describes is the Delhi - Agra - Mathura corridor of
Agra Division, which is the prototype's operating area. Kilometre posts marked
"verified" are taken from the official Indian Railways Station Information
Package (SIP) kilometre figures; the remainder are the prototype's own
operational block boundaries and are labelled as such.

Why this module exists
----------------------
The STEP 11 generator previously invented station codes (``SYN-ST001``) and
coordinates. That made the Live Map, Department views and the optimisation
workflow impossible to demo convincingly, because every artefact on screen was
obviously synthetic. This module replaces the invented topology with real
Agra Division topology while keeping the generator fully deterministic and
reversible.

Cleanup safety
--------------
``LocationMaster`` has no free-text remarks column, so synthetic rows cannot be
tagged with a marker string the way other tables are. Cleanup instead deletes by
the exact set of station/line codes defined here (``REFERENCE_STATION_CODES`` /
``REFERENCE_LINE_CODES``), which is a closed, finite list and therefore safe.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

ZONE_CODE = "NCR"
ZONE_NAME = "North Central Railway"
DIVISION_CODE = "AGC"
DIVISION_NAME = "Agra Division"

# --------------------------------------------------------------------------- #
# Lines and sections
# --------------------------------------------------------------------------- #
# line_code -> display name. "UP"/"DOWN" are the Indian Railways running-line
# conventions (UP towards the northern terminal, DOWN away from it).
LINE_NAMES: dict[str, str] = {
    "UP-MAIN": "UP Main Line",
    "DOWN-MAIN": "DOWN Main Line",
    "3RD-LINE": "Goods Loop Siding",
}

# section_code -> display name.
SECTION_NAMES: dict[str, str] = {
    "AGC-MTJ": "Agra Cantt - Mathura Jn",
    "MTJ-VRBD": "Mathura Jn - Vrindaban Road",
    "PWL-AGC": "Palwal - Agra Cantt",
    "AGC-BHA": "Agra Cantt - Bhandai",
}


@dataclass(frozen=True)
class LocationRef:
    """One ``location_master`` row: a station on a specific running line.

    ``location_master`` is modelled at (station, line) granularity, so a station
    served by three lines produces three rows. ``km_start``/``km_end`` are the
    operational limits of that station's block on that line.
    """

    station_code: str
    station_name: str
    section_code: str
    line_code: str
    km_start: Decimal
    km_end: Decimal
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    km_verified: bool = False

    @property
    def section_name(self) -> str:
        return SECTION_NAMES[self.section_code]

    @property
    def line_name(self) -> str:
        return LINE_NAMES[self.line_code]

    @property
    def km_midpoint(self) -> Decimal:
        return (self.km_start + self.km_end) / Decimal(2)


def _d(value: str) -> Decimal:
    return Decimal(value)


# --------------------------------------------------------------------------- #
# Stations, ordered west -> east along the corridor.
#
# `km` figures flagged km_verified=True are official SIP kilometre posts:
#   AGRA CANTT (AGC) 1343.27 | RAJA KI MANDI (RKM) 1347.15
#   MATHURA JN (MTJ) 1396.73 | BHUTESHWAR (BTSR) 1399.47
# The remainder are the prototype's block boundaries within those posts.
#
# NOTE ON STATION CODES: in Indian Railways "FAR" is **Farah** and "FHT" is
# **Farah Town**. The two are distinct stations and are kept distinct here.
# --------------------------------------------------------------------------- #
LOCATIONS: tuple[LocationRef, ...] = (
    # --- Agra Cantt: division headquarters, A-1 class station -------------
    LocationRef("AGC", "Agra Cantt", "AGC-MTJ", "UP-MAIN",
                _d("1341.200"), _d("1345.800"), _d("27.158400"), _d("77.991200"),
                km_verified=True),
    LocationRef("AGC", "Agra Cantt", "PWL-AGC", "DOWN-MAIN",
                _d("1340.000"), _d("1345.000"), _d("27.158400"), _d("77.991200"),
                km_verified=True),
    # --- Agra Fort: heritage station, A class ------------------------------
    LocationRef("AF", "Agra Fort", "PWL-AGC", "UP-MAIN",
                _d("1338.400"), _d("1341.100"), _d("27.196700"), _d("77.979400")),
    LocationRef("AF", "Agra Fort", "PWL-AGC", "DOWN-MAIN",
                _d("1338.000"), _d("1340.500"), _d("27.196700"), _d("77.979400")),
    # --- Raja Ki Mandi: A class, first station east of AGC ------------------
    LocationRef("RKM", "Raja Ki Mandi", "AGC-MTJ", "UP-MAIN",
                _d("1345.800"), _d("1349.500"), _d("27.201500"), _d("77.997200"),
                km_verified=True),
    LocationRef("RKM", "Raja Ki Mandi", "AGC-MTJ", "DOWN-MAIN",
                _d("1345.000"), _d("1349.000"), _d("27.201500"), _d("77.997200"),
                km_verified=True),
    # --- Idgah Agra: yard access for the division --------------------------
    LocationRef("IDH", "Idgah Agra", "AGC-MTJ", "UP-MAIN",
                _d("1349.600"), _d("1352.400"), _d("27.188900"), _d("78.020300")),
    # --- Kosi Kalan: crossing loop ----------------------------------------
    LocationRef("KSV", "Kosi Kalan", "AGC-MTJ", "UP-MAIN",
                _d("1352.500"), _d("1355.600"), _d("27.245000"), _d("77.890000")),
    # --- Rupbas: rural halt on the AGC-MTJ main line ----------------------
    LocationRef("RBS", "Rupbas", "AGC-MTJ", "UP-MAIN",
                _d("1355.700"), _d("1358.900"), _d("27.262000"), _d("77.630000")),
    LocationRef("RBS", "Rupbas", "AGC-MTJ", "DOWN-MAIN",
                _d("1355.000"), _d("1359.000"), _d("27.262000"), _d("77.630000")),
    # --- Farah (NOT Farah Town, which is FHT) -----------------------------
    LocationRef("FAR", "Farah", "AGC-MTJ", "UP-MAIN",
                _d("1368.000"), _d("1373.000"), _d("27.324000"), _d("77.781000")),
    LocationRef("FAR", "Farah", "AGC-MTJ", "DOWN-MAIN",
                _d("1368.000"), _d("1373.000"), _d("27.324000"), _d("77.781000")),
    # --- Mathura Junction: A-1 class, division boundary -------------------
    LocationRef("MTJ", "Mathura Jn", "AGC-MTJ", "UP-MAIN",
                _d("1390.000"), _d("1395.200"), _d("27.492400"), _d("77.673700"),
                km_verified=True),
    LocationRef("MTJ", "Mathura Jn", "AGC-MTJ", "DOWN-MAIN",
                _d("1395.000"), _d("1402.000"), _d("27.492400"), _d("77.673700"),
                km_verified=True),
    # --- Bhuteshwar: first station beyond MTJ towards Vrindaban -----------
    LocationRef("BTSR", "Bhuteshwar", "MTJ-VRBD", "UP-MAIN",
                _d("1398.100"), _d("1401.400"), _d("27.524000"), _d("77.618000"),
                km_verified=True),
    # --- Bhandai: goods loop / WIMG sidings off Agra Cantt ----------------
    LocationRef("BHA", "Bhandai", "AGC-BHA", "3RD-LINE",
                _d("1332.000"), _d("1336.000"), _d("27.085000"), _d("78.012000")),
    LocationRef("BHA", "Bhandai", "AGC-BHA", "UP-MAIN",
                _d("1330.000"), _d("1335.000"), _d("27.085000"), _d("78.012000")),
    LocationRef("BHA", "Bhandai", "AGC-BHA", "DOWN-MAIN",
                _d("1330.000"), _d("1335.000"), _d("27.085000"), _d("78.012000")),
    # --- Tundla Jn: junction on the BHA branch ----------------------------
    LocationRef("TDL", "Tundla Jn", "AGC-BHA", "3RD-LINE",
                _d("1326.000"), _d("1330.000"), _d("27.150000"), _d("78.200000")),
    # --- Vrindaban / Vrindaban Road: end of the demo corridor -------------
    LocationRef("BDB", "Vrindavan", "MTJ-VRBD", "UP-MAIN",
                _d("1401.500"), _d("1404.800"), _d("27.582000"), _d("77.700000")),
    LocationRef("VRBD", "Vrindaban Road", "MTJ-VRBD", "UP-MAIN",
                _d("1404.900"), _d("1408.200"), _d("27.610000"), _d("77.690000")),
)

# Closed, finite sets used by cleanup to identify generator-owned rows.
REFERENCE_STATION_CODES: tuple[str, ...] = tuple(
    dict.fromkeys(loc.station_code for loc in LOCATIONS)
)
REFERENCE_LINE_CODES: tuple[str, ...] = tuple(LINE_NAMES)


# --------------------------------------------------------------------------- #
# Trains
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class TrainRef:
    """One ``train`` row: a real service, with its running line convention.

    ``train_id`` follows the prototype's ``<number>-<origin>-<destination>``
    convention; freight rakes carry a rake index because many identical rakes
    run on the same corridor.
    """

    train_id: str
    train_number: str
    train_name: str
    origin: str
    destination: str
    direction: str
    start_time: str
    category: str = "PASSENGER"
    loco_class: str | None = None
    rake_index: str | None = None


# Direction convention for this corridor: UP runs towards the Delhi terminal
# (NDLS), DOWN runs away from it towards Mathura / the eastern network.
TRAINS: tuple[TrainRef, ...] = (
    # --- Delhi <-> Bhopal Shatabdi ----------------------------------------
    TrainRef("12002-NDLS-BPL", "12002", "Bhopal Shatabdi Express",
             "NDLS", "BPL", "UP", "06:00", "PASSENGER", "WAP7", None),
    TrainRef("12001-BPL-NDLS", "12001", "Bhopal Shatabdi Express",
             "BPL", "NDLS", "DOWN", "20:30", "PASSENGER", "WAP7", None),
    # --- Delhi <-> Mumbai Rajdani family ----------------------------------
    TrainRef("12952-NDLS-MMCT", "12952", "Mumbai Tejas Rajdhani Express",
             "NDLS", "MMCT", "UP", "16:15", "PASSENGER", "WAP7", None),
    TrainRef("12951-MMCT-NDLS", "12951", "Mumbai Rajdhani Express",
             "MMCT", "NDLS", "DOWN", "09:35", "PASSENGER", "WAP7", None),
    # --- Grand Trunk Express ---------------------------------------------
    TrainRef("12616-NDLS-MAS", "12616", "Grand Trunk Express",
             "NDLS", "MAS", "UP", "21:40", "PASSENGER", "WAP7", None),
    TrainRef("12615-MAS-NDLS", "12615", "Grand Trunk Express",
             "MAS", "NDLS", "DOWN", "19:05", "PASSENGER", "WAP7", None),
    # --- Gatimaan (Agra <-> Hazrat Nizamuddin) ----------------------------
    TrainRef("12049-NZM-AGC", "12049", "Gatimaan Express",
             "NZM", "AGC", "DOWN", "13:40", "PASSENGER", "WAP5", None),
    TrainRef("12050-AGC-NZM", "12050", "Gatimaan Express",
             "AGC", "NZM", "UP", "20:00", "PASSENGER", "WAP5", None),
    # --- Taj Express (Delhi <-> Varanasi via Agra) ------------------------
    TrainRef("12280-NDLS-VGLB", "12280", "Taj Express",
             "NDLS", "VGLB", "DOWN", "12:25", "PASSENGER", "WAP7", None),
    TrainRef("12279-VGLB-NDLS", "12279", "Taj Express",
             "VGLB", "NDLS", "UP", "22:10", "PASSENGER", "WAP7", None),
    # --- Freight: coal and general goods ---------------------------------
    TrainRef("BOXN-TKD-BZA", "BOXN-01", "Coal Freight Rake",
             "TKD", "BZA", "UP", "05:30", "FREIGHT", "WAP7", None),
    TrainRef("BOXN-TKD-BZA-01", "BOXN-01", "Coal Freight Rake (Rake 1)",
             "TKD", "BZA", "UP", "11:30", "FREIGHT", "WAG9", "01"),
    TrainRef("BOXN-BZA-TKD-01", "BOXN-01", "Coal Freight Rake (Empty Return)",
             "BZA", "TKD", "DOWN", "23:30", "FREIGHT", "WAG9", "01"),
    TrainRef("BCN-TKD-02", "BCN-02", "Covered Wagon Freight Rake",
             "TKD", "AGC", "UP", "10:30", "FREIGHT", "WAG9", "02"),
    # --- Vande Bharat / MEMU services on the corridor --------------------
    TrainRef("12090-NDLS-AGC", "12090", "Vande Bharat Express",
             "NDLS", "AGC", "UP", "17:05", "PASSENGER", "WAP7", None),
    TrainRef("12089-AGC-NDLS", "12089", "Vande Bharat Express",
             "AGC", "NDLS", "DOWN", "07:50", "PASSENGER", "WAP7", None),
)

REFERENCE_TRAIN_IDS: tuple[str, ...] = tuple(t.train_id for t in TRAINS)

# Realistic locomotive allocation pools, keyed by class. Indian Railways
# electric loco classes in service on this route.
LOCO_POOL: dict[str, tuple[str, ...]] = {
    "WAP5": ("WAP5-30005", "WAP5-30012", "WAP5-30027", "WAP5-30038"),
    "WAP7": ("WAP7-30214", "WAP7-30333", "WAP7-30452", "WAP7-30501", "WAP7-30615"),
    "WAG9": ("WAG9-31550", "WAG9-31608", "WAG9-31722", "WAG9-31840"),
    "WAM4": ("WAM4-40018", "WAM4-40073", "WAM4-40126"),
    "WDP4": ("WDP4-40042", "WDP4-40188"),
}

# Loco numbers that must stay unset to exercise the "loco not yet shedded"
# branch of the Train Impact view.
LOCO_PENDING: frozenset[str] = frozenset(
    {"BOXN-TKD-BZA", "BOXN-TKD-BZA-01", "BCN-TKD-02", "BOXN-BZA-TKD-01"}
)


def loco_number(train: TrainRef, index: int) -> str | None:
    """Deterministic loco allocation for a train, or None when not yet shedded."""
    if train.train_id in LOCO_PENDING:
        return None
    if train.loco_class is None:
        return None
    pool = LOCO_POOL.get(train.loco_class)
    if not pool:
        return None
    return pool[index % len(pool)]


# --------------------------------------------------------------------------- #
# Topology helpers
#
# These keep the historical ``station_code(idx)`` / ``line_number(idx, idx)``
# signatures used across the generator package, but resolve them against real
# Agra Division topology instead of ``SYN-*`` placeholders.
# --------------------------------------------------------------------------- #
def unique_stations() -> tuple[str, ...]:
    """Station codes in corridor order, de-duplicated."""
    return REFERENCE_STATION_CODES


def station_code(station_idx: int) -> str:
    return unique_stations()[station_idx]


def lines_for(station: str) -> tuple[str, ...]:
    return tuple(
        loc.line_code for loc in LOCATIONS if loc.station_code == station
    )


def station_name_for(station: str) -> str:
    """Display name for a station code, falling back to the code itself."""
    for loc in LOCATIONS:
        if loc.station_code == station:
            return loc.station_name
    return station


def line_number(station_idx: int, line_idx: int) -> str:
    return lines_for(unique_stations()[station_idx])[line_idx]


def station_line_combos() -> tuple[tuple[str, str], ...]:
    """Every ``(station_code, line_code)`` pair, in corridor order."""
    return tuple((loc.station_code, loc.line_code) for loc in LOCATIONS)


def combo_indices(idx: int) -> tuple[int, int, str, str]:
    """Map a combo index to ``(station_idx, line_idx, station_code, line_code)``."""
    station, line = station_line_combos()[idx]
    station_idx = unique_stations().index(station)
    line_idx = lines_for(station).index(line)
    return station_idx, line_idx, station, line


def locations_with_coordinates() -> tuple[LocationRef, ...]:
    """Rows usable for map plotting (both coordinates present)."""
    return tuple(
        loc for loc in LOCATIONS if loc.latitude is not None and loc.longitude is not None
    )


def reference_summary() -> dict:
    """Small provenance/scale summary for the dataset manifest."""
    return {
        "zone": f"{ZONE_CODE} - {ZONE_NAME}",
        "division": f"{DIVISION_CODE} - {DIVISION_NAME}",
        "sections": len(SECTION_NAMES),
        "lines": len(LINE_NAMES),
        "stations": len(REFERENCE_STATION_CODES),
        "location_rows": len(LOCATIONS),
        "mappable_stations": len(
            {loc.station_code for loc in locations_with_coordinates()}
        ),
        "trains": len(TRAINS),
        "km_verified_stations": sorted(
            {loc.station_code for loc in LOCATIONS if loc.km_verified}
        ),
    }
