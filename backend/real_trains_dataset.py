"""
SIH 26027 - Authentic Indian Railways Train Dataset
Contains real train numbers, names, locomotives (WAP-7, WAP-5, WAG-9, WAG-12B),
directions, timetable schedules, and station platform allocations.
"""

REAL_TRAINS_DATASET = [
    {
        "category": "Vande Bharat Express",
        "train_id": "TRAIN-22436",
        "train_number": "22436",
        "train_name": "Vande Bharat Express (New Delhi - Varanasi)",
        "schedule_date": "2026-09-25T06:00:00",
        "start_date": "2026-09-25T06:00:00",
        "loco_number": "WAP7-30201",
        "direction": "DOWN",
        "source_system_id": 4,
        "origin": "NDLS",
        "destination": "BSB",
        "platform": "PF-1",
        "schedules": [
            {"station_code": "NDLS", "sequence_number": 1, "scheduled_arrival": None, "scheduled_departure": "2026-09-25T06:00:00", "line_number": "PF-1"},
            {"station_code": "CNB", "sequence_number": 2, "scheduled_arrival": "2026-09-25T10:08:00", "scheduled_departure": "2026-09-25T10:13:00", "line_number": "PF-2"},
            {"station_code": "PRYJ", "sequence_number": 3, "scheduled_arrival": "2026-09-25T12:08:00", "scheduled_departure": "2026-09-25T12:10:00", "line_number": "PF-1"},
            {"station_code": "BSB", "sequence_number": 4, "scheduled_arrival": "2026-09-25T14:00:00", "scheduled_departure": None, "line_number": "PF-1"}
        ]
    },
    {
        "category": "Vande Bharat Express",
        "train_id": "TRAIN-22435",
        "train_number": "22435",
        "train_name": "Vande Bharat Express (Varanasi - New Delhi)",
        "schedule_date": "2026-09-25T15:00:00",
        "start_date": "2026-09-25T15:00:00",
        "loco_number": "WAP7-30202",
        "direction": "UP",
        "source_system_id": 4,
        "origin": "BSB",
        "destination": "NDLS",
        "platform": "PF-1",
        "schedules": [
            {"station_code": "BSB", "sequence_number": 1, "scheduled_arrival": None, "scheduled_departure": "2026-09-25T15:00:00", "line_number": "PF-1"},
            {"station_code": "PRYJ", "sequence_number": 2, "scheduled_arrival": "2026-09-25T16:30:00", "scheduled_departure": "2026-09-25T16:32:00", "line_number": "PF-1"},
            {"station_code": "CNB", "sequence_number": 3, "scheduled_arrival": "2026-09-25T18:30:00", "scheduled_departure": "2026-09-25T18:35:00", "line_number": "PF-2"},
            {"station_code": "NDLS", "sequence_number": 4, "scheduled_arrival": "2026-09-25T23:00:00", "scheduled_departure": None, "line_number": "PF-1"}
        ]
    },
    {
        "category": "Tejas Rajdhani Express",
        "train_id": "TRAIN-12951",
        "train_number": "12951",
        "train_name": "Mumbai Tejas Rajdhani Express (Mumbai Central - New Delhi)",
        "schedule_date": "2026-09-25T17:00:00",
        "start_date": "2026-09-25T17:00:00",
        "loco_number": "WAP7-30215",
        "direction": "UP",
        "source_system_id": 4,
        "origin": "MMCT",
        "destination": "NDLS",
        "platform": "PF-3",
        "schedules": [
            {"station_code": "MMCT", "sequence_number": 1, "scheduled_arrival": None, "scheduled_departure": "2026-09-25T17:00:00", "line_number": "PF-3"},
            {"station_code": "ADI", "sequence_number": 2, "scheduled_arrival": "2026-09-25T21:45:00", "scheduled_departure": "2026-09-25T21:55:00", "line_number": "PF-1"},
            {"station_code": "NDLS", "sequence_number": 3, "scheduled_arrival": "2026-09-26T08:32:00", "scheduled_departure": None, "line_number": "PF-3"}
        ]
    },
    {
        "category": "Rajdhani Express",
        "train_id": "TRAIN-12301",
        "train_number": "12301",
        "train_name": "Howrah Rajdhani Express (Howrah - New Delhi via Gaya)",
        "schedule_date": "2026-09-25T16:50:00",
        "start_date": "2026-09-25T16:50:00",
        "loco_number": "WAP7-30300",
        "direction": "UP",
        "source_system_id": 4,
        "origin": "HWH",
        "destination": "NDLS",
        "platform": "PF-8",
        "schedules": [
            {"station_code": "HWH", "sequence_number": 1, "scheduled_arrival": None, "scheduled_departure": "2026-09-25T16:50:00", "line_number": "PF-8"},
            {"station_code": "PNBE", "sequence_number": 2, "scheduled_arrival": "2026-09-25T22:20:00", "scheduled_departure": "2026-09-25T22:30:00", "line_number": "PF-4"},
            {"station_code": "PRYJ", "sequence_number": 3, "scheduled_arrival": "2026-09-26T02:35:00", "scheduled_departure": "2026-09-26T02:37:00", "line_number": "PF-5"},
            {"station_code": "NDLS", "sequence_number": 4, "scheduled_arrival": "2026-09-26T10:05:00", "scheduled_departure": None, "line_number": "PF-8"}
        ]
    },
    {
        "category": "Shatabdi Express",
        "train_id": "TRAIN-12002",
        "train_number": "12002",
        "train_name": "Bhopal Shatabdi Express (New Delhi - Rani Kamalapati)",
        "schedule_date": "2026-09-25T06:15:00",
        "start_date": "2026-09-25T06:15:00",
        "loco_number": "WAP5-30005",
        "direction": "DOWN",
        "source_system_id": 4,
        "origin": "NDLS",
        "destination": "RKMP",
        "platform": "PF-16",
        "schedules": [
            {"station_code": "NDLS", "sequence_number": 1, "scheduled_arrival": None, "scheduled_departure": "2026-09-25T06:15:00", "line_number": "PF-16"},
            {"station_code": "CNB", "sequence_number": 2, "scheduled_arrival": "2026-09-25T11:20:00", "scheduled_departure": "2026-09-25T11:25:00", "line_number": "PF-5"},
            {"station_code": "RKMP", "sequence_number": 3, "scheduled_arrival": "2026-09-25T14:40:00", "scheduled_departure": None, "line_number": "PF-1"}
        ]
    },
    {
        "category": "Superfast Express",
        "train_id": "TRAIN-12626",
        "train_number": "12626",
        "train_name": "Kerala Superfast Express (New Delhi - Trivandrum Central)",
        "schedule_date": "2026-09-25T20:10:00",
        "start_date": "2026-09-25T20:10:00",
        "loco_number": "WAP7-30350",
        "direction": "DOWN",
        "source_system_id": 4,
        "origin": "NDLS",
        "destination": "TVC",
        "platform": "PF-4",
        "schedules": [
            {"station_code": "NDLS", "sequence_number": 1, "scheduled_arrival": None, "scheduled_departure": "2026-09-25T20:10:00", "line_number": "PF-4"},
            {"station_code": "CNB", "sequence_number": 2, "scheduled_arrival": "2026-09-26T01:30:00", "scheduled_departure": "2026-09-26T01:35:00", "line_number": "PF-6"},
            {"station_code": "RKMP", "sequence_number": 3, "scheduled_arrival": "2026-09-26T05:00:00", "scheduled_departure": "2026-09-26T05:05:00", "line_number": "PF-2"},
            {"station_code": "MAS", "sequence_number": 4, "scheduled_arrival": "2026-09-26T22:10:00", "scheduled_departure": "2026-09-26T22:35:00", "line_number": "PF-2"}
        ]
    },
    {
        "category": "Heavy Coal Freight Rake",
        "train_id": "FREIGHT-BOXN-401",
        "train_number": "BOXN401",
        "train_name": "BOXN Coal Freight Train (NTPC Dadri Supply)",
        "schedule_date": "2026-09-25T08:00:00",
        "start_date": "2026-09-25T08:00:00",
        "loco_number": "WAG9-31405",
        "direction": "UP",
        "source_system_id": 4,
        "origin": "NDLS",
        "destination": "CNB",
        "platform": "BYPASS-LINE-1",
        "schedules": [
            {"station_code": "NDLS", "sequence_number": 1, "scheduled_arrival": None, "scheduled_departure": "2026-09-25T11:00:00", "line_number": "BYPASS-LINE-1"},
            {"station_code": "CNB", "sequence_number": 2, "scheduled_arrival": "2026-09-25T15:30:00", "scheduled_departure": None, "line_number": "GOODS-YARD-2"}
        ]
    },
    {
        "category": "Industrial Goods Freight",
        "train_id": "FREIGHT-BCNA-204",
        "train_number": "BCNA204",
        "train_name": "BCNA Cement Goods Train (UltraTech Rake)",
        "schedule_date": "2026-09-25T10:30:00",
        "start_date": "2026-09-25T10:30:00",
        "loco_number": "WAG12B-60012",
        "direction": "DOWN",
        "source_system_id": 4,
        "origin": "ADI",
        "destination": "MMCT",
        "platform": "BYPASS-LINE-2",
        "schedules": [
            {"station_code": "ADI", "sequence_number": 1, "scheduled_arrival": None, "scheduled_departure": "2026-09-25T02:00:00", "line_number": "BYPASS-LINE-2"},
            {"station_code": "MMCT", "sequence_number": 2, "scheduled_arrival": "2026-09-25T08:30:00", "scheduled_departure": None, "line_number": "GOODS-YARD-1"}
        ]
    }
]
