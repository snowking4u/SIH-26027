"""Create the multi-plan demonstration block-plan scenario.

The script is IDEMPOTENT (safe to run twice) and does NOT invent new tasks or
requirements. It wires the EXISTING synthetic dataset into a set of distinct
deterministic demo chains:

    planning_task  ->  candidate_block_window (real FEASIBLE match)
        ->  optimization_run -> optimization_input -> optimization_output
        ->  block_plan -> block_plan_task
        ->  plan_validation (runs the real validator)

One primary plan (RAILFLOW-DEMO-PLAN-001) uses the original single feasible
candidate (planning task 1419 -> derived 30-minute window). The extended demo
plans (RAILFLOW-DEMO-PLAN-002 .. 006) add genuinely derivable multi-hour gaps
to five (station, line, day) combinations by transforming that day's synthetic
line-occupancy into the mixed availability template (keeping the original
07:00-07:30 / 18:00-18:30 gaps and adding 08:00-09:30, 13:00-15:00 and
19:00-21:00). AvailableWindow rows are then created for the new gaps using the
same application_coa_sources semantics as the derivation service. Every plan
task is placed inside such a FEASIBLE window and validated by the real
deterministic validator, which yields 4/4 PASSED records for each plan.

The script also cleans the stale session probe plan (PROBE-2026-001) and
resets any previous human decisions on the demo plans so the Controller queue
holds exactly the six pending demo plans.

Usage:
    python scripts/demo_scenario.py [--cleanup-only] [--print-chain]
"""

from datetime import date, datetime, time, timedelta
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.available_window import AvailableWindow
from app.models.block_plan import BlockPlan
from app.models.block_plan_task import BlockPlanTask
from app.models.candidate_block_window import CandidateBlockWindow
from app.models.controller_decision import ControllerDecision
from app.models.line_occupancy import LineOccupancy
from app.models.optimization_input import OptimizationInput
from app.models.optimization_output import OptimizationOutput
from app.models.optimization_run import OptimizationRun
from app.models.plan_validation import PlanValidation
from app.models.planning_task import PlanningTask
from app.models.train_schedule import TrainSchedule
from app.services.plan_validation import store_plan_validations
from app.schemas.block_plan import REWORK_REQUIRED

# Fixed identifiers for the demo scenario (idempotent lookup keys).
PROBE_PLAN_CODES = ("PROBE-2026-001",)
DEMO_RUN_CODE = "RAILFLOW-DEMO-RUN-001"
DEMO_PLAN_CODE = "RAILFLOW-DEMO-PLAN-001"

# Same source semantics emitted by the available-window derivation service.
WINDOW_CALC_SOURCE = "DETERMINISTIC:COA_SOURCE_DERIVATION_GAP"
WINDOW_STATUS_AVAILABLE = "AVAILABLE"
CANDIDATE_FEASIBLE_STATUS = "FEASIBLE"
CANDIDATE_FEASIBLE_REASON = "FEASIBLE_TEMPORAL_MATCH"

# Mixed availability template, minutes from midnight: the OCCUPIED intervals
# leave gaps at 07:00-07:30, 08:00-09:30, 13:00-15:00, 18:00-18:30 and
# 19:00-21:00. The first three minutes-intervals mirror the existing daily
# tight rows so in-place mutation preserves occupancy ids (and therefore any
# FK provenance on existing AvailableWindow rows).
MIXED_OCCUPANCY_TEMPLATE = [
    (0, 420),
    (450, 480),
    (570, 780),
    (900, 1080),
    (1110, 1140),
    (1260, 1440),
]

# Existing tight rows appear in this order within a day (00:00, 07:30, 18:30) --
# they are transformed IN PLACE (ids preserved) so existing AvailableWindow
# ``source_occupancy_id`` provenance never dangles.

# The five extended demo plans. Every task's block requirement needs NO
# power/traffic block and the task location/line matches the derived window,
# so the deterministic validator records exactly 4/4 PASSED with no warnings.
EXTENDED_DEMO_PLANS = [
    {
        "plan_code": "RAILFLOW-DEMO-PLAN-002",
        "run_code": "RAILFLOW-DEMO-RUN-002",
        "task_id": 1434,  # RELAY_REPLACEMENT (SIGNAL) SYN-ST001 / SYN-L002
        "station_code": "SYN-ST001",
        "line_number": "SYN-L002",
        "plan_day": date(2026, 9, 26),
        "gap_index": 1,  # 08:00-09:30
        "candidate_minutes": 60,
    },
    {
        "plan_code": "RAILFLOW-DEMO-PLAN-003",
        "run_code": "RAILFLOW-DEMO-RUN-003",
        "task_id": 1409,  # REPLACEMENT (BRIDGE) SYN-ST002 / SYN-L012
        "station_code": "SYN-ST002",
        "line_number": "SYN-L012",
        "plan_day": date(2026, 9, 26),
        "gap_index": 2,  # 13:00-15:00
        "candidate_minutes": 120,
    },
    {
        "plan_code": "RAILFLOW-DEMO-PLAN-004",
        "run_code": "RAILFLOW-DEMO-RUN-004",
        "task_id": 1441,  # WIRING_RECTIFICATION (POINT_MACHINE) SYN-ST001 / SYN-L001
        "station_code": "SYN-ST001",
        "line_number": "SYN-L001",
        "plan_day": date(2026, 9, 27),
        "gap_index": 1,  # 08:00-09:30
        "candidate_minutes": 90,
    },
    {
        "plan_code": "RAILFLOW-DEMO-PLAN-005",
        "run_code": "RAILFLOW-DEMO-RUN-005",
        "task_id": 1431,  # TRACK_RECONDITIONING (SIGNAL) SYN-ST002 / SYN-L011
        "station_code": "SYN-ST002",
        "line_number": "SYN-L011",
        "plan_day": date(2026, 9, 28),
        "gap_index": 2,  # 13:00-15:00
        "candidate_minutes": 90,
    },
    {
        "plan_code": "RAILFLOW-DEMO-PLAN-006",
        "run_code": "RAILFLOW-DEMO-RUN-006",
        "task_id": 1443,  # PANEL_INSPECTION (TRACK) SYN-ST001 / SYN-L002
        "station_code": "SYN-ST001",
        "line_number": "SYN-L002",
        "plan_day": date(2026, 9, 29),
        "gap_index": 1,  # 08:00-09:30
        "candidate_minutes": 60,
    },
]


def _cleanup_probe_plan(db) -> list:
    """Delete the stale session-probe plan and its children."""
    removed = []
    for code in PROBE_PLAN_CODES:
        plan = db.scalar(select(BlockPlan).where(BlockPlan.plan_code == code))
        if plan is None:
            continue
        db.query(PlanValidation).filter(
            PlanValidation.block_plan_id == plan.id
        ).delete(synchronize_session=False)
        db.query(ControllerDecision).filter(
            ControllerDecision.block_plan_id == plan.id
        ).delete(synchronize_session=False)
        db.query(BlockPlanTask).filter(
            BlockPlanTask.block_plan_id == plan.id
        ).delete(synchronize_session=False)
        db.delete(plan)
        removed.append(code)
    return removed


def _reset_demo_decisions(db) -> int:
    """Remove prior human decisions from ALL demo plans.

    A human decision is a recorded operational action, not master data; the
    demo scenario resets it so the Controller queue starts with the six plans
    pending review. Any demo plan that previously entered the rework workflow
    (REWORK_REQUIRED after a rejection) is restored to PROPOSED so it
    reappears in the pending recommendation queue.
    """
    codes = [DEMO_PLAN_CODE] + [p["plan_code"] for p in EXTENDED_DEMO_PLANS]
    plans = db.scalars(select(BlockPlan).where(BlockPlan.plan_code.in_(codes))).all()
    removed = 0
    for plan in plans:
        removed += db.query(ControllerDecision).filter(
            ControllerDecision.block_plan_id == plan.id
        ).delete(synchronize_session=False)
        if plan.status == REWORK_REQUIRED:
            plan.status = "PROPOSED"
    return removed


def _latest_feasible_candidate(db) -> CandidateBlockWindow:
    candidate = db.scalar(
        select(CandidateBlockWindow)
        .where(CandidateBlockWindow.feasible.is_(True))
        .order_by(CandidateBlockWindow.id.desc())
        .limit(1)
    )
    if candidate is None:
        raise SystemExit(
            "No FEASIBLE candidate_block_window found. Run the synthetic "
            "dataset generator first (scripts/generate_synthetic_data.py) or "
            "POST /api/candidates/check for a feasible task/window pair."
        )
    return candidate


def _available_gap_windows(
    db, station_code: str, line_number: str, plan_day: date
) -> list:
    """Make (station, line, day) use the mixed availability template.

    Transforms the existing tight daily line-occupancy rows IN PLACE (keeping
    their ids so any ``source_occupancy_id`` provenance stays valid), adds the
    extra occupied intervals, then persists AvailableWindow rows for every gap
    using the same calculation source as the derivation service. Existing
    windows for the 07:00-07:30 and 18:00-18:30 gaps remain valid, so no
    candidate/window records are ever deleted.

    Returns the sorted gap windows (07:30, 08:00, 13:00, 18:00, 19:00 gaps).
    """
    day_start = datetime.combine(plan_day, time.min)
    day_end = day_start + timedelta(days=1)
    day_key = plan_day.strftime("%Y%m%d")

    rows = list(
        db.scalars(
            select(LineOccupancy)
            .where(
                LineOccupancy.station_code == station_code,
                LineOccupancy.line_number == line_number,
                LineOccupancy.occupancy_start >= day_start,
                LineOccupancy.occupancy_start < day_end,
            )
            .order_by(LineOccupancy.occupancy_start)
        )
    )
    day_slots = [
        (day_start + timedelta(minutes=start_min), day_start + timedelta(minutes=end_min))
        for start_min, end_min in MIXED_OCCUPANCY_TEMPLATE
    ]
    matched = set()
    for row in rows:
        pair = (row.occupancy_start, row.occupancy_end)
        if pair in day_slots:
            matched.add(pair)
    missing = [slot for slot in day_slots if slot not in matched]
    unmatched = [
        row
        for row in rows
        if (row.occupancy_start, row.occupancy_end) not in set(day_slots)
    ]

    train_id = db.scalar(
        select(LineOccupancy.train_id).where(
            LineOccupancy.station_code == station_code,
            LineOccupancy.line_number == line_number,
            LineOccupancy.train_id.is_not(None),
        )
    )
    if train_id is None:
        train_id = rows[0].train_id if rows else None

    source_counter = 0
    for row, slot in zip(unmatched, missing):
        row.occupancy_start, row.occupancy_end = slot
        row.occupancy_status = "OCCUPIED"
        row.train_id = train_id
    for slot in missing[len(unmatched):]:
        source_counter += 1
        db.add(
            LineOccupancy(
                station_code=station_code,
                line_number=line_number,
                occupancy_start=slot[0],
                occupancy_end=slot[1],
                occupancy_status="OCCUPIED",
                train_id=train_id,
                source_event_id=(
                    f"SYN-COA-OCC-{station_code}-{line_number}-"
                    f"{day_key}-E{source_counter}"
                ),
                remarks=(
                    "Demo scenario: mixed availability template line occupancy."
                ),
            )
        )
    for row in unmatched[len(missing):]:
        db.delete(row)
    db.flush()

    occupied = list(
        db.scalars(
            select(LineOccupancy)
            .where(
                LineOccupancy.station_code == station_code,
                LineOccupancy.line_number == line_number,
                LineOccupancy.occupancy_start >= day_start,
                LineOccupancy.occupancy_start < day_end,
            )
            .order_by(LineOccupancy.occupancy_start)
        )
    )
    conflicts = [(o.occupancy_start, o.occupancy_end) for o in occupied]
    for sched in db.scalars(
        select(TrainSchedule).where(
            TrainSchedule.station_code == station_code,
            TrainSchedule.scheduled_arrival >= day_start,
            TrainSchedule.scheduled_arrival < day_end,
        )
    ):
        arrival = sched.scheduled_arrival
        departure = sched.scheduled_departure or arrival
        if departure > arrival:
            conflicts.append((arrival, departure))

    conflicts.sort(key=lambda pair: pair[0])
    merged = []
    for start, end in conflicts:
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))

    gaps = []
    cursor = day_start
    for start, end in merged:
        if start > cursor:
            gaps.append((cursor, start))
        if end > cursor:
            cursor = end
    if cursor < day_end:
        gaps.append((cursor, day_end))

    gap_windows = []
    for gap_start, gap_end in gaps:
        window = db.scalar(
            select(AvailableWindow).where(
                AvailableWindow.station_code == station_code,
                AvailableWindow.line_number == line_number,
                AvailableWindow.window_start == gap_start,
                AvailableWindow.window_end == gap_end,
            )
        )
        if window is None:
            window = AvailableWindow(
                station_code=station_code,
                line_number=line_number,
                window_start=gap_start,
                window_end=gap_end,
                duration_minutes=int(
                    (gap_end - gap_start).total_seconds() // 60
                ),
                window_status=WINDOW_STATUS_AVAILABLE,
                calculation_source=WINDOW_CALC_SOURCE,
                generated_at=datetime.utcnow(),
                remarks=(
                    "Derived time gap: RAILFLOW demo mixed availability "
                    "template."
                ),
            )
            db.add(window)
            db.flush()
        source = db.scalar(
            select(LineOccupancy).where(
                LineOccupancy.station_code == station_code,
                LineOccupancy.line_number == line_number,
                LineOccupancy.occupancy_end == gap_start,
            )
        )
        if source is not None:
            window.source_occupancy_id = source.id
        gap_windows.append((gap_start, gap_end, window.id))

    db.commit()
    return sorted(gap_windows)


def _seed_extended_plan(db, cfg: dict) -> dict:
    task = db.get(PlanningTask, cfg["task_id"])
    if task is None:
        raise SystemExit(f"Planning task {cfg['task_id']} not found")

    gaps = _available_gap_windows(
        db, cfg["station_code"], cfg["line_number"], cfg["plan_day"]
    )
    if cfg["gap_index"] >= len(gaps):
        raise SystemExit(
            f"No gap at index {cfg['gap_index']} for {cfg['plan_code']}"
        )
    gap_start, gap_end, window_id = gaps[cfg["gap_index"]]
    window = db.get(AvailableWindow, window_id)

    slot_start = gap_start
    slot_end = slot_start + timedelta(minutes=cfg["candidate_minutes"])
    if slot_end > gap_end:
        raise SystemExit(
            f"Planned slot exceeds derived gap for {cfg['plan_code']}"
        )

    block = task.block_requirement
    candidate = db.scalar(
        select(CandidateBlockWindow).where(
            CandidateBlockWindow.planning_task_id == task.id,
            CandidateBlockWindow.available_window_id == window.id,
        )
    )
    if candidate is None:
        candidate = CandidateBlockWindow(
            planning_task_id=task.id,
            block_requirement_id=block.id if block is not None else None,
            available_window_id=window.id,
            candidate_start=slot_start,
            candidate_end=slot_end,
            candidate_duration_minutes=cfg["candidate_minutes"],
            feasible=True,
            feasibility_status=CANDIDATE_FEASIBLE_STATUS,
            feasibility_reason=CANDIDATE_FEASIBLE_REASON,
        )
        db.add(candidate)
        db.flush()

    run = db.scalar(
        select(OptimizationRun).where(OptimizationRun.run_code == cfg["run_code"])
    )
    if run is None:
        run = OptimizationRun(
            run_code=cfg["run_code"],
            run_type="PLANNING",
            status="COMPLETED",
            started_at=slot_start,
            completed_at=slot_end,
            model_name="STEP10-DETERMINISTIC",
            model_version="STEP10-DETERMINISTIC-1.0",
            objective_description=(
                "Deterministic demo scenario: place one feasible candidate "
                f"(task {task.id}) into controller-reviewed plan "
                f"{cfg['plan_code']}."
            ),
        )
        db.add(run)
        db.flush()
        db.add(
            OptimizationInput(
                optimization_run_id=run.id,
                planning_task_id=task.id,
                candidate_block_window_id=candidate.id,
                input_role="TASK",
            )
        )
        db.add(
            OptimizationInput(
                optimization_run_id=run.id,
                planning_task_id=task.id,
                candidate_block_window_id=candidate.id,
                input_role="CANDIDATE_WINDOW",
            )
        )
        db.add(
            OptimizationOutput(
                optimization_run_id=run.id,
                planning_task_id=task.id,
                candidate_block_window_id=candidate.id,
                output_type="WINDOW_ASSIGNMENT",
                output_status="PROPOSED",
                selected=True,
                output_payload={
                    "scenario": "RAILFLOW_DEMO",
                    "station_code": cfg["station_code"],
                    "line_number": cfg["line_number"],
                },
            )
        )
        db.flush()

    plan = db.scalar(
        select(BlockPlan).where(BlockPlan.plan_code == cfg["plan_code"])
    )
    if plan is None:
        horizon_start = datetime.combine(cfg["plan_day"], time.min)
        end_of_day = datetime.combine(cfg["plan_day"], time.max)
        plan = BlockPlan(
            optimization_run_id=run.id,
            plan_code=cfg["plan_code"],
            plan_date=cfg["plan_day"],
            status="PROPOSED",
            planning_horizon_start=horizon_start,
            planning_horizon_end=end_of_day,
            description=(
                "Demo scenario - a validated block proposal for "
                f"{task.task_code} at {cfg['station_code']} "
                f"({cfg['line_number']})."
            ),
        )
        db.add(plan)
        db.flush()

    plan_task = db.scalar(
        select(BlockPlanTask).where(
            BlockPlanTask.block_plan_id == plan.id,
            BlockPlanTask.planning_task_id == task.id,
        )
    )
    if plan_task is None:
        plan_task = BlockPlanTask(
            block_plan_id=plan.id,
            planning_task_id=task.id,
            candidate_block_window_id=candidate.id,
            planned_start=slot_start,
            planned_end=slot_end,
            planned_duration_minutes=cfg["candidate_minutes"],
            sequence_number=1,
            status="PROPOSED",
            remarks="RAILFLOW_DEMO deterministic placement.",
        )
        db.add(plan_task)
        db.flush()

    db.commit()
    validations = store_plan_validations(db, plan.id)

    return {
        "plan_id": plan.id,
        "plan_code": plan.plan_code,
        "task_id": task.id,
        "task_code": task.task_code,
        "candidate_id": candidate.id,
        "available_window_id": window.id,
        "block_plan_task_id": plan_task.id,
        "optimization_run_id": run.id,
        "validation_ids": [v.id for v in validations],
        "station_code": cfg["station_code"],
        "line_number": cfg["line_number"],
        "planned_start": slot_start.isoformat(),
        "planned_end": slot_end.isoformat(),
        "validation_summary": {
            "passed": sum(1 for r in validations if r.validation_status == "PASSED"),
            "failed": sum(1 for r in validations if r.validation_status == "FAILED"),
            "warnings": sum(1 for r in validations if r.validation_status == "WARNING"),
        },
    }


def _seed_primary_plan(db) -> dict:
    """Seed/refresh RAILFLOW-DEMO-PLAN-001 on its original feasible candidate."""
    plan = db.scalar(select(BlockPlan).where(BlockPlan.plan_code == DEMO_PLAN_CODE))
    if plan is not None:
        plan_task = db.scalar(
            select(BlockPlanTask)
            .where(BlockPlanTask.block_plan_id == plan.id)
            .order_by(BlockPlanTask.id)
            .limit(1)
        )
        if plan_task is None:
            raise SystemExit(
                f"{DEMO_PLAN_CODE} exists but has no block plan tasks."
            )
        task = db.get(PlanningTask, plan_task.planning_task_id)
        candidate = db.get(CandidateBlockWindow, plan_task.candidate_block_window_id)
        if candidate is None:
            raise SystemExit(
                f"{DEMO_PLAN_CODE} task references a missing candidate."
            )
        window = db.get(AvailableWindow, candidate.available_window_id)
        run = db.get(OptimizationRun, plan.optimization_run_id)
        start, end = plan_task.planned_start, plan_task.planned_end
        plan_task_id = plan_task.id
        station_code = window.station_code if window else task.location_code
        line_number = window.line_number if window else "SYN-LINE"
        validations = store_plan_validations(db, plan.id)
    else:
        candidate = _latest_feasible_candidate(db)
        task = db.get(PlanningTask, candidate.planning_task_id)
        window = db.get(AvailableWindow, candidate.available_window_id)
        station_code = window.station_code if window else task.location_code
        line_number = window.line_number if window else "SYN-LINE"
        start = candidate.candidate_start
        end = candidate.candidate_end

        run = db.scalar(
            select(OptimizationRun).where(OptimizationRun.run_code == DEMO_RUN_CODE)
        )
        if run is None:
            run = OptimizationRun(
                run_code=DEMO_RUN_CODE,
                run_type="PLANNING",
                status="COMPLETED",
                started_at=start,
                completed_at=end,
                model_name="STEP10-DETERMINISTIC",
                model_version="STEP10-DETERMINISTIC-1.0",
                objective_description=(
                    "Deterministic demo scenario: place the single feasible "
                    "candidate (task->window) into one controller-reviewed plan."
                ),
            )
            db.add(run)
            db.flush()
            db.add(
                OptimizationInput(
                    optimization_run_id=run.id,
                    planning_task_id=task.id,
                    candidate_block_window_id=candidate.id,
                    input_role="TASK",
                )
            )
            db.add(
                OptimizationInput(
                    optimization_run_id=run.id,
                    planning_task_id=task.id,
                    candidate_block_window_id=candidate.id,
                    input_role="CANDIDATE_WINDOW",
                )
            )
            db.add(
                OptimizationOutput(
                    optimization_run_id=run.id,
                    planning_task_id=task.id,
                    candidate_block_window_id=candidate.id,
                    output_type="WINDOW_ASSIGNMENT",
                    output_status="PROPOSED",
                    selected=True,
                    output_payload={
                        "scenario": "RAILFLOW_DEMO",
                        "station_code": station_code,
                        "line_number": line_number,
                    },
                )
            )
            db.flush()

        plan = BlockPlan(
            optimization_run_id=run.id,
            plan_code=DEMO_PLAN_CODE,
            plan_date=start.date(),
            status="PROPOSED",
            planning_horizon_start=datetime.combine(
                start.date(), datetime.min.time()
            ),
            planning_horizon_end=datetime.combine(
                start.date(), datetime.max.time()
            ),
            description=(
                "Demo scenario - one validated block proposal for "
                f"{task.task_code} at {station_code} ({line_number})."
            ),
        )
        db.add(plan)
        db.flush()

        plan_task = BlockPlanTask(
            block_plan_id=plan.id,
            planning_task_id=task.id,
            candidate_block_window_id=candidate.id,
            planned_start=start,
            planned_end=end,
            planned_duration_minutes=candidate.candidate_duration_minutes,
            sequence_number=1,
            status="PROPOSED",
            remarks="RAILFLOW_DEMO deterministic placement.",
        )
        db.add(plan_task)
        db.flush()
        db.commit()
        plan_task_id = plan_task.id
        validations = store_plan_validations(db, plan.id)

    return {
        "plan_id": plan.id,
        "plan_code": plan.plan_code,
        "task_id": task.id,
        "task_code": task.task_code,
        "candidate_id": candidate.id,
        "available_window_id": candidate.available_window_id,
        "block_plan_task_id": plan_task_id,
        "optimization_run_id": run.id if run is not None else plan.optimization_run_id,
        "validation_ids": [v.id for v in validations],
        "station_code": station_code,
        "line_number": line_number,
        "planned_start": start.isoformat(),
        "planned_end": end.isoformat(),
        "validation_summary": {
            "passed": sum(1 for r in validations if r.validation_status == "PASSED"),
            "failed": sum(1 for r in validations if r.validation_status == "FAILED"),
            "warnings": sum(1 for r in validations if r.validation_status == "WARNING"),
        },
    }


def _print_chain(label: str, chain: dict) -> None:
    print(f"\n== {label} ==")
    for key, value in chain.items():
        print(f"{key}: {value}")
    print("Validation records:")
    print(f"  passed={chain['validation_summary']['passed']} "
          f"failed={chain['validation_summary']['failed']} "
          f"warnings={chain['validation_summary']['warnings']}")


def seed_demo_scenario(print_chain: bool = True) -> dict:
    with SessionLocal() as db:
        removed = _cleanup_probe_plan(db)
        reset_decision_count = _reset_demo_decisions(db)
        db.commit()

        primary = _seed_primary_plan(db)
        extended = [_seed_extended_plan(db, cfg) for cfg in EXTENDED_DEMO_PLANS]

        result = {
            "primary": primary,
            "extended": extended,
            "removed_probe_plans": removed,
            "reset_demo_decisions": reset_decision_count,
        }

        if print_chain:
            print("== RAILFLOW DEMO SCENARIO ==")
            print(f"removed_probe_plans: {removed or 'none'}")
            print(f"reset_demo_decisions: {reset_decision_count}")
            _print_chain("PRIMARY PLAN", primary)
            for cfg, chain in zip(EXTENDED_DEMO_PLANS, extended):
                _print_chain(cfg["plan_code"], chain)

        return result


if __name__ == "__main__":
    cleanup_only = "--cleanup-only" in sys.argv
    if cleanup_only:
        with SessionLocal() as db:
            removed = _cleanup_probe_plan(db)
            db.commit()
            print(f"Removed probe plans: {removed or 'none'}")
    else:
        seed_demo_scenario()