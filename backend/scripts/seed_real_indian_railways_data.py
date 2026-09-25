r"""Seed real Indian Railways locations, trains, schedules, movements, line occupancies, and available maintenance windows into backend.db.
"""

from datetime import datetime, timedelta
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.database import SessionLocal, engine
from app.models import (
    AssetMaster,
    AvailableWindow,
    LineOccupancy,
    LocationMaster,
    Train,
    TrainMovement,
    TrainSchedule,
)

REAL_LOCATIONS = [
    {"code": "NDLS", "name": "New Delhi", "km": 0.0},
    {"code": "MTJ", "name": "Mathura Junction", "km": 141.0},
    {"code": "AGC", "name": "Agra Cantt", "km": 195.0},
    {"code": "DHO", "name": "Dholpur Junction", "km": 248.0},
    {"code": "MRA", "name": "Morena", "km": 275.0},
    {"code": "GWL", "name": "Gwalior Junction", "km": 313.0},
    {"code": "VGLJ", "name": "VGL Jhansi Junction", "km": 411.0},
    {"code": "CNB", "name": "Kanpur Central", "km": 440.0},
    {"code": "PRYJ", "name": "Prayagraj Junction", "km": 635.0},
    {"code": "BSB", "name": "Varanasi Junction", "km": 758.0},
]

REAL_TRAINS = [
    {
        "train_id": "TRAIN-22436",
        "train_number": "22436",
        "train_name": "Vande Bharat Express (New Delhi - Varanasi)",
        "loco_number": "WAP7-30201",
        "direction": "DOWN",
        "station": "NDLS",
        "flag": "D",
        "line": "L-DN",
        "stops": [
            ("NDLS", 0, "06:00:00", "06:00:00"),
            ("CNB", 1, "10:08:00", "10:13:00"),
            ("PRYJ", 2, "12:08:00", "12:10:00"),
            ("BSB", 3, "14:00:00", "14:00:00"),
        ],
    },
    {
        "train_id": "TRAIN-22435",
        "train_number": "22435",
        "train_name": "Vande Bharat Express (Varanasi - New Delhi)",
        "loco_number": "WAP7-30202",
        "direction": "UP",
        "station": "BSB",
        "flag": "D",
        "line": "L-UP",
        "stops": [
            ("BSB", 0, "15:00:00", "15:00:00"),
            ("PRYJ", 1, "16:35:00", "16:37:00"),
            ("CNB", 2, "18:30:00", "18:35:00"),
            ("NDLS", 3, "23:00:00", "23:00:00"),
        ],
    },
    {
        "train_id": "TRAIN-12002",
        "train_number": "12002",
        "train_name": "Bhopal Shatabdi Express (New Delhi - Rani Kamlapati)",
        "loco_number": "WAP5-30005",
        "direction": "DOWN",
        "station": "AGC",
        "flag": "A",
        "line": "L-DN",
        "stops": [
            ("NDLS", 0, "06:00:00", "06:00:00"),
            ("MTJ", 1, "07:19:00", "07:20:00"),
            ("AGC", 2, "07:50:00", "07:55:00"),
            ("GWL", 3, "09:23:00", "09:28:00"),
            ("VGLJ", 4, "10:45:00", "10:50:00"),
        ],
    },
    {
        "train_id": "TRAIN-12951",
        "train_number": "12951",
        "train_name": "Mumbai Tejas Rajdhani Express (Mumbai Central - New Delhi)",
        "loco_number": "WAP7-30215",
        "direction": "UP",
        "station": "MTJ",
        "flag": "T",
        "line": "L-UP",
        "stops": [
            ("GWL", 0, "05:10:00", "05:12:00"),
            ("AGC", 1, "06:30:00", "06:35:00"),
            ("MTJ", 2, "07:15:00", "07:17:00"),
            ("NDLS", 3, "08:32:00", "08:32:00"),
        ],
    },
    {
        "train_id": "TRAIN-12301",
        "train_number": "12301",
        "train_name": "Howrah Rajdhani Express (Howrah - New Delhi)",
        "loco_number": "WAP7-30300",
        "direction": "UP",
        "station": "CNB",
        "flag": "A",
        "line": "L-UP",
        "stops": [
            ("BSB", 0, "00:45:00", "00:55:00"),
            ("PRYJ", 1, "02:43:00", "02:45:00"),
            ("CNB", 2, "04:50:00", "04:55:00"),
            ("NDLS", 3, "10:05:00", "10:05:00"),
        ],
    },
    {
        "train_id": "TRAIN-12626",
        "train_number": "12626",
        "train_name": "Kerala Superfast Express (New Delhi - Trivandrum Central)",
        "loco_number": "WAP7-30350",
        "direction": "DOWN",
        "station": "GWL",
        "flag": "D",
        "line": "L-DN",
        "stops": [
            ("NDLS", 0, "20:10:00", "20:10:00"),
            ("MTJ", 1, "21:38:00", "21:40:00"),
            ("AGC", 2, "22:20:00", "22:25:00"),
            ("GWL", 3, "00:03:00", "00:05:00"),
            ("VGLJ", 4, "01:30:00", "01:38:00"),
        ],
    },
    {
        "train_id": "TRAIN-12192",
        "train_number": "12192",
        "train_name": "Shaan-e-Bhopal SF Express (Jabalpur - Hazrat Nizamuddin)",
        "loco_number": "WAP7-30412",
        "direction": "UP",
        "station": "VGLJ",
        "flag": "A",
        "line": "L-UP",
        "stops": [
            ("VGLJ", 0, "04:15:00", "04:23:00"),
            ("GWL", 1, "05:33:00", "05:35:00"),
            ("MRA", 2, "06:05:00", "06:07:00"),
            ("AGC", 3, "07:40:00", "07:45:00"),
            ("NDLS", 4, "11:55:00", "11:55:00"),
        ],
    },
    {
        "train_id": "TRAIN-12802",
        "train_number": "12802",
        "train_name": "Purushottam Express (New Delhi - Puri)",
        "loco_number": "WAP7-30188",
        "direction": "DOWN",
        "station": "PRYJ",
        "flag": "T",
        "line": "L-DN",
        "stops": [
            ("NDLS", 0, "22:40:00", "22:40:00"),
            ("CNB", 1, "04:00:00", "04:05:00"),
            ("PRYJ", 2, "06:55:00", "07:00:00"),
            ("BSB", 3, "09:50:00", "10:00:00"),
        ],
    },
    {
        "train_id": "TRAIN-12417",
        "train_number": "12417",
        "train_name": "Prayagraj Express (Prayagraj - New Delhi)",
        "loco_number": "WAP7-30501",
        "direction": "UP",
        "station": "PRYJ",
        "flag": "D",
        "line": "L-UP",
        "stops": [
            ("PRYJ", 0, "22:10:00", "22:10:00"),
            ("CNB", 1, "00:25:00", "00:30:00"),
            ("NDLS", 2, "07:00:00", "07:00:00"),
        ],
    },
    {
        "train_id": "TRAIN-12918",
        "train_number": "12918",
        "train_name": "Gujarat Sampark Kranti Express (Hazrat Nizamuddin - Ahmedabad)",
        "loco_number": "WAP7-30290",
        "direction": "DOWN",
        "station": "DHO",
        "flag": "T",
        "line": "L-DN",
        "stops": [
            ("NDLS", 0, "13:25:00", "13:25:00"),
            ("MTJ", 1, "14:53:00", "14:55:00"),
            ("AGC", 2, "15:40:00", "15:45:00"),
            ("DHO", 3, "16:40:00", "16:42:00"),
        ],
    },
    {
        "train_id": "TRAIN-12280",
        "train_number": "12280",
        "train_name": "Taj Express (New Delhi - VGL Jhansi)",
        "loco_number": "WAP5-30012",
        "direction": "DOWN",
        "station": "MRA",
        "flag": "T",
        "line": "L-DN",
        "stops": [
            ("NDLS", 0, "06:55:00", "06:55:00"),
            ("MTJ", 1, "08:35:00", "08:40:00"),
            ("AGC", 2, "09:20:00", "09:25:00"),
            ("DHO", 3, "10:25:00", "10:27:00"),
            ("MRA", 4, "10:58:00", "11:00:00"),
            ("GWL", 5, "11:50:00", "11:55:00"),
            ("VGLJ", 6, "14:00:00", "14:00:00"),
        ],
    },
    {
        "train_id": "TRAIN-12724",
        "train_number": "12724",
        "train_name": "Telangana Express (New Delhi - Hyderabad)",
        "loco_number": "WAP7-30610",
        "direction": "DOWN",
        "station": "BSB",
        "flag": "A",
        "line": "L-DN",
        "stops": [
            ("NDLS", 0, "16:00:00", "16:00:00"),
            ("MTJ", 1, "17:28:00", "17:30:00"),
            ("AGC", 2, "18:05:00", "18:10:00"),
            ("GWL", 3, "19:58:00", "20:00:00"),
            ("VGLJ", 4, "21:45:00", "21:53:00"),
        ],
    },
]


def seed_data():
    db = SessionLocal()
    try:
        today = datetime.now().date()
        base_dt = datetime.combine(today, datetime.min.time())

        # 1. Seed Locations
        print("Seeding Real Indian Railways Locations...")
        db.query(LocationMaster).delete()
        loc_map = {}
        for item in REAL_LOCATIONS:
            # Create UP Line Location
            loc_up = LocationMaster(
                zone_code="NCR",
                zone_name="North Central Railway",
                division_code="AGC",
                division_name="Agra Division",
                section_code="NDLS-BSB",
                section_name="New Delhi - Varanasi Main Corridor",
                station_code=item["code"],
                station_name=item["name"],
                line_code=f"L-UP-{item['code']}",
                line_name=f"UP Main Line ({item['name']})",
                km_start=item["km"],
                km_end=item["km"] + 5.0,
            )
            # Create DOWN Line Location
            loc_dn = LocationMaster(
                zone_code="NCR",
                zone_name="North Central Railway",
                division_code="AGC",
                division_name="Agra Division",
                section_code="NDLS-BSB",
                section_name="New Delhi - Varanasi Main Corridor",
                station_code=item["code"],
                station_name=item["name"],
                line_code=f"L-DN-{item['code']}",
                line_name=f"DOWN Main Line ({item['name']})",
                km_start=item["km"],
                km_end=item["km"] + 5.0,
            )
            db.add(loc_up)
            db.add(loc_dn)
            db.flush()
            loc_map[item["code"]] = loc_up

        # 2. Seed Trains, Schedules, Movements, and Line Occupancies
        print("Seeding Authentic Trains & Schedules...")
        db.query(LineOccupancy).delete()
        db.query(TrainMovement).delete()
        db.query(TrainSchedule).delete()
        db.query(Train).delete()
        db.query(AvailableWindow).delete()

        for idx, t_data in enumerate(REAL_TRAINS, start=1):
            train_obj = Train(
                train_id=t_data["train_id"],
                train_number=t_data["train_number"],
                train_name=t_data["train_name"],
                schedule_date=base_dt,
                start_date=base_dt,
                loco_number=t_data["loco_number"],
                direction=t_data["direction"],
                source_system_id=4,
            )
            db.add(train_obj)
            db.flush()

            # Add Schedules
            for seq, (st_code, st_seq, arr_str, dep_str) in enumerate(t_data["stops"]):
                arr_dt = base_dt + timedelta(seconds=_parse_secs(arr_str)) if arr_str else None
                dep_dt = base_dt + timedelta(seconds=_parse_secs(dep_str)) if dep_str else None
                sched = TrainSchedule(
                    train_id=train_obj.id,
                    station_code=st_code,
                    sequence_number=st_seq,
                    scheduled_arrival=arr_dt,
                    scheduled_departure=dep_dt,
                    line_number=t_data["line"],
                    source_schedule_id=f"SCHED-{t_data['train_number']}-{st_code}",
                )
                db.add(sched)

            # Add Latest Active Movement
            mvmt_dt = base_dt + timedelta(hours=7, minutes=idx * 15)
            mvmt = TrainMovement(
                train_id=train_obj.id,
                station_code=t_data["station"],
                movement_flag=t_data["flag"],
                movement_datetime=mvmt_dt,
                line_number=t_data["line"],
                source_event_id=f"EVT-{t_data['train_number']}-{t_data['station']}",
            )
            db.add(mvmt)

            # Add Line Occupancy
            occ = LineOccupancy(
                station_code=t_data["station"],
                line_number=f"{t_data['line']}-{t_data['station']}",
                occupancy_start=mvmt_dt - timedelta(minutes=30),
                occupancy_end=mvmt_dt + timedelta(minutes=45),
                occupancy_status="OCCUPIED",
                train_id=train_obj.id,
                source_event_id=f"OCC-{t_data['train_number']}-{t_data['station']}",
            )
            db.add(occ)

        # 3. Add Available Maintenance Windows
        for loc in REAL_LOCATIONS:
            w_start = base_dt + timedelta(hours=11)
            w_end = base_dt + timedelta(hours=14)
            window = AvailableWindow(
                station_code=loc["code"],
                line_number=f"L-UP-{loc['code']}",
                window_start=w_start,
                window_end=w_end,
                duration_minutes=180,
                window_status="AVAILABLE",
                calculation_source="COA_DERIVED",
                generated_at=base_dt,
            )
            db.add(window)

        db.commit()
        print(f"Successfully seeded {len(REAL_TRAINS)} authentic trains across {len(REAL_LOCATIONS)} stations!")
    except Exception as e:
        db.rollback()
        print("Error seeding real train data:", e)
        raise
    finally:
        db.close()


def _parse_secs(time_str: str) -> int:
    h, m, s = map(int, time_str.split(":"))
    return h * 3600 + m * 60 + s


if __name__ == "__main__":
    seed_data()
