import urllib.request
import json
import datetime
import sys

API_BASE_URL = "http://10.102.158.177:8011"

def api_post(endpoint, payload):
    url = f"{API_BASE_URL}{endpoint}"
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        res = urllib.request.urlopen(req)
        return True, json.loads(res.read().decode())
    except Exception as e:
        return False, str(e)

print("=" * 65)
print("  SIH 26027 - REAL INDIAN RAILWAYS COA DATA GENERATOR")
print("=" * 65)

# 1. Real Stations (Locations)
real_locations = [
    {"station_code": "NDLS", "station_name": "New Delhi Railway Station", "zone_code": "NR", "division_code": "DLI", "line_code": "NDLS-MAIN", "line_name": "Delhi Main Trunk", "km_start": 0.0, "km_end": 0.5, "latitude": 28.6431, "longitude": 77.2197},
    {"station_code": "HWH", "station_name": "Howrah Junction", "zone_code": "ER", "division_code": "HWH", "line_code": "HWH-MAIN", "line_name": "Howrah Main Line", "km_start": 0.0, "km_end": 1.2, "latitude": 22.5839, "longitude": 88.3426},
    {"station_code": "MMCT", "station_name": "Mumbai Central", "zone_code": "WR", "division_code": "MMCT", "line_code": "WR-MAIN", "line_name": "Mumbai Western Trunk", "km_start": 0.0, "km_end": 0.8, "latitude": 18.9696, "longitude": 72.8193},
    {"station_code": "MAS", "station_name": "MGR Chennai Central", "zone_code": "SR", "division_code": "MAS", "line_code": "SR-MAIN", "line_name": "Chennai Main Line", "km_start": 0.0, "km_end": 0.9, "latitude": 13.0827, "longitude": 80.2707},
    {"station_code": "CNB", "station_name": "Kanpur Central", "zone_code": "NCR", "division_code": "PRYJ", "line_code": "NCR-TRUNK", "line_name": "Kanpur Central Junction", "km_start": 435.0, "km_end": 436.5, "latitude": 26.4542, "longitude": 80.3502},
    {"station_code": "PRYJ", "station_name": "Prayagraj Junction", "zone_code": "NCR", "division_code": "PRYJ", "line_code": "NCR-MAIN", "line_name": "Prayagraj Main Route", "km_start": 628.0, "km_end": 629.5, "latitude": 25.4484, "longitude": 81.8295},
    {"station_code": "BSB", "station_name": "Varanasi Junction", "zone_code": "NR", "division_code": "LKO", "line_code": "NR-BSB", "line_name": "Varanasi Main Line", "km_start": 756.0, "km_end": 757.2, "latitude": 25.3268, "longitude": 82.9863},
    {"station_code": "RKMP", "station_name": "Rani Kamalapati (Bhopal)", "zone_code": "WCR", "division_code": "BPL", "line_code": "WCR-TRUNK", "line_name": "Rani Kamalapati Terminal", "km_start": 700.0, "km_end": 701.2, "latitude": 23.2201, "longitude": 77.4365},
    {"station_code": "ADI", "station_name": "Ahmedabad Junction", "zone_code": "WR", "division_code": "ADI", "line_code": "WR-ADI", "line_name": "Ahmedabad Main Line", "km_start": 492.0, "km_end": 493.5, "latitude": 23.0225, "longitude": 72.5714},
    {"station_code": "SBC", "station_name": "KSR Bengaluru City", "zone_code": "SWR", "division_code": "SBC", "line_code": "SWR-MAIN", "line_name": "Bengaluru Trunk Line", "km_start": 0.0, "km_end": 1.0, "latitude": 12.9781, "longitude": 77.5697},
    {"station_code": "VSKP", "station_name": "Visakhapatnam Junction", "zone_code": "ECoR", "division_code": "WAT", "line_code": "ECOR-MAIN", "line_name": "Visakhapatnam Port Trunk", "km_start": 750.0, "km_end": 751.5, "latitude": 17.7231, "longitude": 83.2906},
    {"station_code": "SC", "station_name": "Secunderabad Junction", "zone_code": "SCR", "division_code": "SC", "line_code": "SCR-MAIN", "line_name": "Secunderabad Main Line", "km_start": 0.0, "km_end": 1.2, "latitude": 17.4339, "longitude": 78.5017},
    {"station_code": "LKO", "station_name": "Lucknow Charbagh NR", "zone_code": "NR", "division_code": "LKO", "line_code": "NR-LKO", "line_name": "Lucknow Trunk Line", "km_start": 512.0, "km_end": 513.5, "latitude": 26.8317, "longitude": 80.9242},
    {"station_code": "PNBE", "station_name": "Patna Junction", "zone_code": "ECR", "division_code": "DNR", "line_code": "ECR-MAIN", "line_name": "Patna Main Trunk", "km_start": 545.0, "km_end": 546.5, "latitude": 25.6022, "longitude": 85.1376},
    {"station_code": "CSMT", "station_name": "Mumbai CSMT", "zone_code": "CR", "division_code": "BB", "line_code": "CR-MAIN", "line_name": "Chhatrapati Shivaji Maharaj Terminus", "km_start": 0.0, "km_end": 0.8, "latitude": 18.9402, "longitude": 72.8356}
]

print("\n1. Feeding Real Stations (/api/locations)...")
loc_count = 0
for loc in real_locations:
    ok, _ = api_post("/api/locations", loc)
    if ok:
        loc_count += 1
        print(f"  [OK] Station: {loc['station_code']} ({loc['station_name']})")

print(f"Total Stations Feeded: {loc_count}/{len(real_locations)}")

# 2. Real Indian Railways Trains
real_trains = [
    {"train_id": "TRAIN-22436", "train_number": "22436", "train_name": "Vande Bharat Express (New Delhi - Varanasi)", "schedule_date": "2026-09-25T06:00:00", "start_date": "2026-09-25T06:00:00", "loco_number": "WAP7-30201", "direction": "DOWN", "source_system_id": 4},
    {"train_id": "TRAIN-22435", "train_number": "22435", "train_name": "Vande Bharat Express (Varanasi - New Delhi)", "schedule_date": "2026-09-25T15:00:00", "start_date": "2026-09-25T15:00:00", "loco_number": "WAP7-30202", "direction": "UP", "source_system_id": 4},
    {"train_id": "TRAIN-20901", "train_number": "20901", "train_name": "Vande Bharat Express (Mumbai Central - Gandhinagar Capital)", "schedule_date": "2026-09-25T06:10:00", "start_date": "2026-09-25T06:10:00", "loco_number": "WAP7-30450", "direction": "UP", "source_system_id": 4},
    {"train_id": "TRAIN-20833", "train_number": "20833", "train_name": "Vande Bharat Express (Visakhapatnam - Secunderabad)", "schedule_date": "2026-09-25T05:45:00", "start_date": "2026-09-25T05:45:00", "loco_number": "WAP7-30510", "direction": "UP", "source_system_id": 4},
    {"train_id": "TRAIN-12951", "train_number": "12951", "train_name": "Mumbai Tejas Rajdhani Express (Mumbai Central - New Delhi)", "schedule_date": "2026-09-25T17:00:00", "start_date": "2026-09-25T17:00:00", "loco_number": "WAP7-30215", "direction": "UP", "source_system_id": 4},
    {"train_id": "TRAIN-12301", "train_number": "12301", "train_name": "Howrah Rajdhani Express (Howrah - New Delhi via Gaya)", "schedule_date": "2026-09-25T16:50:00", "start_date": "2026-09-25T16:50:00", "loco_number": "WAP7-30300", "direction": "UP", "source_system_id": 4},
    {"train_id": "TRAIN-12002", "train_number": "12002", "train_name": "Bhopal Shatabdi Express (New Delhi - Rani Kamalapati)", "schedule_date": "2026-09-25T06:00:00", "start_date": "2026-09-25T06:00:00", "loco_number": "WAP5-30005", "direction": "DOWN", "source_system_id": 4},
    {"train_id": "TRAIN-12626", "train_number": "12626", "train_name": "Kerala Superfast Express (New Delhi - Trivandrum Central)", "schedule_date": "2026-09-25T20:10:00", "start_date": "2026-09-25T20:10:00", "loco_number": "WAP7-30350", "direction": "DOWN", "source_system_id": 4},
    {"train_id": "FREIGHT-BOXN-401", "train_number": "BOXN401", "train_name": "BOXN Coal Freight Train (NTPC Dadri Supply)", "schedule_date": "2026-09-25T08:00:00", "start_date": "2026-09-25T08:00:00", "loco_number": "WAG9-31405", "direction": "UP", "source_system_id": 4},
    {"train_id": "FREIGHT-BCNA-204", "train_number": "BCNA204", "train_name": "BCNA Cement Goods Train (UltraTech Rake)", "schedule_date": "2026-09-25T10:30:00", "start_date": "2026-09-25T10:30:00", "loco_number": "WAG12B-60012", "direction": "DOWN", "source_system_id": 4}
]

print("\n2. Feeding Real Trains (/api/coa/trains)...")
train_count = 0
for t in real_trains:
    ok, _ = api_post("/api/coa/trains", t)
    if ok:
        train_count += 1
        print(f"  [OK] Train [{t['train_number']}] {t['train_name']}")

print(f"Total Trains Feeded: {train_count}/{len(real_trains)}")

# Fetch database ID mapping
trains_in_db = json.loads(urllib.request.urlopen(f"{API_BASE_URL}/api/coa/trains?limit=500").read().decode())
db_map = {}
for t in trains_in_db:
    num = t.get('train_number')
    if num and num not in db_map:
        db_map[num] = t['id']

# 3. Real Schedules
print("\n3. Feeding Real Schedules (/api/coa/schedules)...")
schedules_count = 0
routes = [
    ("22436", [("NDLS", 1, None, "2026-09-25T06:00:00"), ("CNB", 2, "2026-09-25T10:08:00", "2026-09-25T10:13:00"), ("PRYJ", 3, "2026-09-25T12:08:00", "2026-09-25T12:10:00"), ("BSB", 4, "2026-09-25T14:00:00", None)]),
    ("12002", [("NDLS", 1, None, "2026-09-25T06:15:00"), ("CNB", 2, "2026-09-25T11:20:00", "2026-09-25T11:25:00"), ("RKMP", 3, "2026-09-25T14:40:00", None)]),
    ("12951", [("MMCT", 1, None, "2026-09-25T17:00:00"), ("ADI", 2, "2026-09-25T21:45:00", "2026-09-25T21:55:00"), ("NDLS", 3, "2026-09-26T08:32:00", None)]),
    ("12301", [("HWH", 1, None, "2026-09-25T16:50:00"), ("PNBE", 2, "2026-09-25T22:20:00", "2026-09-25T22:30:00"), ("NDLS", 3, "2026-09-26T10:05:00", None)]),
    ("20833", [("VSKP", 1, None, "2026-09-25T05:45:00"), ("SC", 2, "2026-09-25T14:15:00", None)]),
    ("12626", [("NDLS", 1, None, "2026-09-25T20:10:00"), ("CNB", 2, "2026-09-26T01:30:00", "2026-09-26T01:35:00"), ("MAS", 3, "2026-09-26T22:10:00", None)]),
    ("BOXN401", [("NDLS", 1, None, "2026-09-25T11:00:00"), ("CNB", 2, "2026-09-25T15:30:00", None)]),
    ("BCNA204", [("ADI", 1, None, "2026-09-25T02:00:00"), ("MMCT", 2, "2026-09-25T08:30:00", None)])
]

for t_no, stn_stops in routes:
    if t_no in db_map:
        tid = db_map[t_no]
        for stn, seq, arr, dep in stn_stops:
            sch = {
                "train_id": tid,
                "station_code": stn,
                "scheduled_arrival": arr,
                "scheduled_departure": dep,
                "sequence_number": seq,
                "line_number": f"PF-{seq}",
                "source_schedule_id": f"SCH-{t_no}-{stn}",
                "remarks": f"Real Schedule - Train {t_no}"
            }
            ok, _ = api_post("/api/coa/schedules", sch)
            if ok:
                schedules_count += 1

print(f"Total Real Schedules Feeded: {schedules_count}")

# 4. Real Movements
print("\n4. Feeding Real Movements (/api/coa/movements)...")
mov_count = 0
for t_no, stn_stops in routes:
    if t_no in db_map:
        tid = db_map[t_no]
        for stn, seq, arr, dep in stn_stops[:2]:
            mov = {
                "train_id": tid,
                "station_code": stn,
                "movement_flag": "D" if seq == 1 else "A",
                "movement_datetime": dep or arr or datetime.datetime.now().isoformat(),
                "line_number": "PF-1",
                "source_event_id": f"MOV-{t_no}-{stn}",
                "remarks": f"Real movement logged for {t_no} at {stn}"
            }
            ok, _ = api_post("/api/coa/movements", mov)
            if ok:
                mov_count += 1

print(f"Total Real Movements Feeded: {mov_count}")

# 5. Real Line Occupancies
print("\n5. Feeding Real Line Occupancies (/api/coa/line-occupancy)...")
now_iso = datetime.datetime.now().isoformat()
occupancies = [
    {"station_code": "NDLS", "line_number": "PF-1", "occupancy_start": "2026-09-25T05:30:00", "occupancy_end": "2026-09-25T06:05:00", "occupancy_status": "OCCUPIED", "remarks": "Vande Bharat 22436 Platform Hold"},
    {"station_code": "NDLS", "line_number": "PF-16", "occupancy_start": "2026-09-25T05:45:00", "occupancy_end": "2026-09-25T06:20:00", "occupancy_status": "OCCUPIED", "remarks": "Bhopal Shatabdi 12002 Platform Hold"},
    {"station_code": "MMCT", "line_number": "PF-3", "occupancy_start": "2026-09-25T16:30:00", "occupancy_end": "2026-09-25T17:05:00", "occupancy_status": "OCCUPIED", "remarks": "Tejas Rajdhani 12951 Boarding"},
    {"station_code": "HWH", "line_number": "PF-8", "occupancy_start": "2026-09-25T16:15:00", "occupancy_end": "2026-09-25T16:55:00", "occupancy_status": "OCCUPIED", "remarks": "Howrah Rajdhani 12301 Boarding"},
    {"station_code": "VSKP", "line_number": "PF-1", "occupancy_start": "2026-09-25T05:15:00", "occupancy_end": "2026-09-25T05:50:00", "occupancy_status": "OCCUPIED", "remarks": "Vande Bharat 20833 Platform Hold"}
]
occ_count = 0
for occ in occupancies:
    ok, _ = api_post("/api/coa/line-occupancy", occ)
    if ok:
        occ_count += 1

print(f"Total Real Line Occupancies Feeded: {occ_count}/{len(occupancies)}")

# 6. Real Operational Events
print("\n6. Feeding Real Operational Events (/api/coa/events)...")
op_events = [
    {"event_type": "SIGNAL_CLEARANCE", "event_datetime": now_iso, "station_code": "NDLS", "description": "Green signal clearance issued for Vande Bharat Express 22436 on PF-1"},
    {"event_type": "LOCO_ATTACHMENT", "event_datetime": now_iso, "station_code": "CNB", "description": "WAP7 loco attached to Howrah Rajdhani Express 12301"},
    {"event_type": "PLATFORM_ALLOCATION", "event_datetime": now_iso, "station_code": "MMCT", "description": "Platform 3 allocated for Tejas Rajdhani Express 12951"},
    {"event_type": "TRACK_INSPECTION", "event_datetime": now_iso, "station_code": "PRYJ", "description": "Track geometry and points inspection completed for Prayagraj Division"}
]
evt_count = 0
for evt in op_events:
    ok, _ = api_post("/api/coa/events", evt)
    if ok:
        evt_count += 1

print(f"Total Real Operational Events Feeded: {evt_count}/{len(op_events)}")
print("\n" + "=" * 65)
print("  REAL COA DATA GENERATION AND FEED COMPLETE!")
print("=" * 65)
