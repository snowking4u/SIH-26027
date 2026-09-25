"""STEP 11 cleanup: marker-based, FK-safe synthetic-data removal.

Rows carrying the synthetic marker (``SYN-*`` identifiers) are deleted, plus
junk/unresolvable rows that pollute the Live Map (placeholder master rows and
COA station/line codes with no master-network definition). Id sets are
materialized into Python collections first so the deletes are legal on both
PostgreSQL and the SQLite test harness. Nothing is truncated and the seeded
TMS/TDMS/SMMS/COA source systems are never touched.
"""

from __future__ import annotations

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.models import (
    AssetMaster,
    AssetParameter,
    AvailableWindow,
    BlockPlan,
    BlockPlanTask,
    BlockRequirement,
    CandidateBlockWindow,
    ControllerDecision,
    DefectFailure,
    ExecutionOutcome,
    LineOccupancy,
    LocationMaster,
    MaintenanceRequirement,
    OperationalEvent,
    OptimizationInput,
    OptimizationOutput,
    OptimizationRun,
    PlanValidation,
    PlanningConstraint,
    PlanningPriority,
    PlanningResource,
    PlanningTask,
    SMMSAlert,
    SMMSInspection,
    SMMSMaintenance,
    TDMSFailure,
    TDMSInspection,
    TDMSMaintenance,
    TMSDefect,
    TMSInspection,
    TMSMaintenance,
    TaskDependency,
    TaskResource,
    Train,
    TrainMovement,
    TrainSchedule,
)

from .config import MARKER

# Placeholder tokens that a runtime POST can stuff into master/geometry
# fields (e.g. Swagger "Try it out" default bodies). Rows matching these on
# any structural name field are treated as junk, never as real master data.
JUNK_TOKENS = frozenset(
    {"string", "null", "test", "dummy", "demo", "xxx", "placeholder", "sample"}
)


def _ids(result) -> set[int]:
    return set(result.scalars().all())


def cleanup_synthetic(db: Session) -> dict[str, int]:
    """Delete synthetic STEP 11 rows in dependency-safe order."""
    marker = f"%{MARKER}%"

    syn_asset_ids = _ids(
        db.execute(select(AssetMaster.id).where(AssetMaster.source_asset_id.like("SYN-%")))
    )
    br_ids = _ids(
        db.execute(
            select(BlockRequirement.id).where(BlockRequirement.remarks.like(marker))
        )
    )
    mr_ids = _ids(
        db.execute(
            select(MaintenanceRequirement.id).where(
                MaintenanceRequirement.description.like(marker)
            )
        )
    )
    task_ids = _ids(
        db.execute(
            select(PlanningTask.id).where(
                or_(
                    PlanningTask.description.like(marker),
                    PlanningTask.maintenance_requirement_id.in_(mr_ids),
                )
            )
        )
    )
    cand_ids = _ids(
        db.execute(
            select(CandidateBlockWindow.id).where(
                or_(
                    CandidateBlockWindow.planning_task_id.in_(task_ids),
                    CandidateBlockWindow.block_requirement_id.in_(br_ids),
                )
            )
        )
    )
    opt_run_ids = _ids(
        db.execute(
            select(OptimizationRun.id).where(OptimizationRun.run_code.like("SYN-OPT-%"))
        )
    )
    resource_ids = _ids(
        db.execute(
            select(PlanningResource.id).where(
                PlanningResource.resource_code.like("SYN-RES-%")
            )
        )
    )
    dep_ids = _ids(
        db.execute(
            select(TaskDependency.id).where(TaskDependency.description.like(marker))
        )
    )
    constraint_ids = _ids(
        db.execute(
            select(PlanningConstraint.id).where(
                PlanningConstraint.planning_task_id.in_(task_ids)
            )
        )
    )
    # Live Map "data integrity" sweep. The marker rules above only match rows
    # emitted by the generator. The Live Map also ingests COA tables and the
    # master network, which can be polluted at runtime (placeholder bodies
    # POSTed to /api/locations or /api/coa/*). Remove those junk rows and any
    # row that cannot resolve onto the master network (station/line codes with
    # no LocationMaster definition) in the same dependency-safe order. Real
    # master rows are untouched: their names are not placeholder tokens and
    # their codes resolve to LocationMaster.
    junk_loc_ids = _ids(
        db.execute(
            select(LocationMaster.id).where(
                or_(
                    func.lower(LocationMaster.station_code).in_(JUNK_TOKENS),
                    func.lower(LocationMaster.station_name).in_(JUNK_TOKENS),
                    func.lower(LocationMaster.line_code).in_(JUNK_TOKENS),
                    func.lower(LocationMaster.line_name).in_(JUNK_TOKENS),
                    func.lower(LocationMaster.section_code).in_(JUNK_TOKENS),
                    func.lower(LocationMaster.division_name).in_(JUNK_TOKENS),
                )
            )
        )
    )
    junk_station_codes: set[str] = _ids(
        db.execute(
            select(LocationMaster.station_code).where(
                LocationMaster.id.in_(junk_loc_ids)
            )
        )
    )
    junk_line_codes: set[str] = _ids(
        db.execute(
            select(LocationMaster.line_code).where(LocationMaster.id.in_(junk_loc_ids))
        )
    )
    defined_stations = set(db.scalars(select(LocationMaster.station_code).distinct()).all())
    defined_lines = set(db.scalars(select(LocationMaster.line_code).distinct()).all())
    referenced_stations: set[str] = set()
    referenced_lines: set[str] = set()
    for station_col, line_col, model in (
        (TrainMovement.station_code, TrainMovement.line_number, TrainMovement),
        (TrainSchedule.station_code, TrainSchedule.line_number, TrainSchedule),
        (LineOccupancy.station_code, LineOccupancy.line_number, LineOccupancy),
        (AvailableWindow.station_code, AvailableWindow.line_number, AvailableWindow),
    ):
        referenced_stations |= _ids(
            db.execute(
                select(station_col)
                .where(station_col.is_not(None))
                .distinct()
            )
        )
        referenced_lines |= _ids(
            db.execute(select(line_col).where(line_col.is_not(None)).distinct())
        )
    bad_stations = junk_station_codes | (referenced_stations - defined_stations)
    bad_lines = junk_line_codes | (referenced_lines - defined_lines)

    junk_asset_ids = _ids(
        db.execute(
            select(AssetMaster.id).where(AssetMaster.location_id.in_(junk_loc_ids))
        )
    )
    junk_mr_ids = _ids(
        db.execute(
            select(MaintenanceRequirement.id).where(
                MaintenanceRequirement.asset_id.in_(junk_asset_ids)
            )
        )
    )
    junk_task_ids = _ids(
        db.execute(
            select(PlanningTask.id).where(PlanningTask.location_code.in_(bad_stations))
        )
    )
    junk_br_ids = _ids(
        db.execute(
            select(BlockRequirement.id).where(
                or_(
                    BlockRequirement.station_code.in_(bad_stations),
                    BlockRequirement.line_number.in_(bad_lines),
                )
            )
        )
    )

    # Merge junk targets into the marker-driven sets so one ordered pass
    # removes the whole pipeline.
    syn_asset_ids |= junk_asset_ids
    mr_ids |= junk_mr_ids
    task_ids |= junk_task_ids
    br_ids |= junk_br_ids

    # Recompute candidates from the merged task/requirement ids so junk rows
    # feed the same block-plan/optimization pipeline as synthetic rows do.
    cand_ids = _ids(
        db.execute(
            select(CandidateBlockWindow.id).where(
                or_(
                    CandidateBlockWindow.planning_task_id.in_(task_ids),
                    CandidateBlockWindow.block_requirement_id.in_(br_ids),
                )
            )
        )
    )

    # Occupancy rows that cannot be placed on the network (junk or unresolved
    # station/line) are removed; windows referencing them are removed via the
    # aw_ids set below, honoring the available_window -> line_occupancy FK.
    junk_occ_ids = _ids(
        db.execute(
            select(LineOccupancy.id).where(
                or_(
                    LineOccupancy.station_code.in_(bad_stations),
                    LineOccupancy.line_number.in_(bad_lines),
                )
            )
        )
    )

    # Block-plan pipeline ids: block plans built on synthetic runs, planning
    # tasks, or candidate windows (including rework/revision rows).
    bp_task_ids = _ids(
        db.execute(
            select(BlockPlanTask.id).where(
                or_(
                    BlockPlanTask.planning_task_id.in_(task_ids),
                    BlockPlanTask.candidate_block_window_id.in_(cand_ids),
                )
            )
        )
    )
    bp_block_ids = _ids(
        db.execute(
            select(BlockPlanTask.block_plan_id).where(
                BlockPlanTask.id.in_(bp_task_ids)
            )
        )
    )
    bp_ids = _ids(
        db.execute(
            select(BlockPlan.id).where(
                or_(
                    BlockPlan.id.in_(bp_block_ids),
                    BlockPlan.optimization_run_id.in_(opt_run_ids),
                )
            )
        )
    )
    # Transitive closure over revises_plan_id so a revision pointing at a
    # synthetic plan is removed too (self-FK revises_plan_id is RESTRICT).
    bp_ids = set(bp_ids)
    expanded = True
    while expanded:
        expanded = False
        found = _ids(
            db.execute(
                select(BlockPlan.id).where(
                    BlockPlan.revises_plan_id.in_(bp_ids)
                )
            )
        )
        new_ids = found - bp_ids
        if new_ids:
            bp_ids |= new_ids
            expanded = True

    # COA-derived available windows: removed by id set so windows that
    # reference synthetic schedules/occupancies (RESTRICT) are cleared even
    # when their remarks do not carry the marker. Id sets are materialized
    # before available_window (deleted later than its schedule/occupancy
    # sources would prefer, but after these dependents are gone).
    coa_schedule_ids = _ids(
        db.execute(
            select(TrainSchedule.id).where(
                TrainSchedule.source_schedule_id.like("SYN-COA-%")
            )
        )
    )
    coa_occupancy_ids = _ids(
        db.execute(
            select(LineOccupancy.id).where(
                LineOccupancy.source_event_id.like("SYN-COA-%")
            )
        )
    )
    aw_ids = _ids(
        db.execute(
            select(AvailableWindow.id).where(
                or_(
                    AvailableWindow.remarks.like(marker),
                    AvailableWindow.source_schedule_id.in_(coa_schedule_ids),
                    AvailableWindow.source_occupancy_id.in_(coa_occupancy_ids),
                    AvailableWindow.source_occupancy_id.in_(junk_occ_ids),
                    AvailableWindow.station_code.in_(bad_stations),
                    AvailableWindow.line_number.in_(bad_lines),
                )
            )
        )
    )

    tracking: list[tuple[str, int]] = []

    def run(name: str, stmt) -> int:
        result = db.execute(stmt)
        tracking.append((name, result.rowcount or 0))
        return result.rowcount or 0

    # 1-5. Block-plan pipeline (references candidates, tasks, optimization
    # runs; must be removed before candidate/run optimization deletes).
    run(
        "execution_outcome",
        delete(ExecutionOutcome).where(
            or_(
                ExecutionOutcome.block_plan_id.in_(bp_ids),
                ExecutionOutcome.block_plan_task_id.in_(bp_task_ids),
            )
        ),
    )
    run(
        "controller_decision",
        delete(ControllerDecision).where(
            ControllerDecision.block_plan_id.in_(bp_ids)
        ),
    )
    run(
        "plan_validation",
        delete(PlanValidation).where(PlanValidation.block_plan_id.in_(bp_ids)),
    )
    run(
        "block_plan_task",
        delete(BlockPlanTask).where(
            or_(
                BlockPlanTask.id.in_(bp_task_ids),
                BlockPlanTask.block_plan_id.in_(bp_ids),
            )
        ),
    )
    # Revisions reference their base plan (revises_plan_id RESTRICT), so
    # delete revision rows before the plans they revise, chaining as needed.
    remaining = set(bp_ids)
    while True:
        revision_ids = _ids(
            db.execute(
                select(BlockPlan.id).where(BlockPlan.revises_plan_id.in_(remaining))
            )
        )
        if not revision_ids:
            break
        run(
            "block_plan_revision",
            delete(BlockPlan).where(BlockPlan.id.in_(revision_ids)),
        )
        remaining -= revision_ids
    run("block_plan", delete(BlockPlan).where(BlockPlan.id.in_(remaining)))

    # 6-8. Optimization layer (references candidates/tasks/resources/deps).
    run(
        "optimization_output",
        delete(OptimizationOutput).where(
            or_(
                OptimizationOutput.optimization_run_id.in_(opt_run_ids),
                OptimizationOutput.planning_task_id.in_(task_ids),
                OptimizationOutput.candidate_block_window_id.in_(cand_ids),
            )
        ),
    )
    run(
        "optimization_input",
        delete(OptimizationInput).where(
            or_(
                OptimizationInput.optimization_run_id.in_(opt_run_ids),
                OptimizationInput.planning_task_id.in_(task_ids),
                OptimizationInput.candidate_block_window_id.in_(cand_ids),
                OptimizationInput.planning_resource_id.in_(resource_ids),
                OptimizationInput.task_dependency_id.in_(dep_ids),
                OptimizationInput.planning_constraint_id.in_(constraint_ids),
            )
        ),
    )
    run(
        "optimization_run",
        delete(OptimizationRun).where(OptimizationRun.id.in_(opt_run_ids)),
    )

    # 9. Candidate windows.
    run(
        "candidate_block_window",
        delete(CandidateBlockWindow).where(
            or_(
                CandidateBlockWindow.planning_task_id.in_(task_ids),
                CandidateBlockWindow.block_requirement_id.in_(br_ids),
            )
        ),
    )

    # 10-14. Planning layer.
    run(
        "planning_priority",
        delete(PlanningPriority).where(PlanningPriority.planning_task_id.in_(task_ids)),
    )
    run(
        "task_dependency",
        delete(TaskDependency).where(
            or_(
                TaskDependency.predecessor_task_id.in_(task_ids),
                TaskDependency.successor_task_id.in_(task_ids),
            )
        ),
    )
    run(
        "task_resource",
        delete(TaskResource).where(TaskResource.planning_task_id.in_(task_ids)),
    )
    run(
        "planning_constraint",
        delete(PlanningConstraint).where(PlanningConstraint.id.in_(constraint_ids)),
    )
    run("planning_task", delete(PlanningTask).where(PlanningTask.id.in_(task_ids)))
    run("block_requirement", delete(BlockRequirement).where(BlockRequirement.id.in_(br_ids)))

    # 15-16. Unified layer. Defect failures are matched by synthetic asset
    # because the SMMS normalizer re-writes remarks without the marker.
    run(
        "maintenance_requirement",
        delete(MaintenanceRequirement).where(MaintenanceRequirement.id.in_(mr_ids)),
    )
    run(
        "defect_failure",
        delete(DefectFailure).where(DefectFailure.asset_id.in_(syn_asset_ids)),
    )

    # 17. Resources.
    run(
        "planning_resource",
        delete(PlanningResource).where(PlanningResource.id.in_(resource_ids)),
    )

    # 18. Derived windows tagged synthetic (or referencing synthetic COA).
    run(
        "available_window",
        delete(AvailableWindow).where(AvailableWindow.id.in_(aw_ids)),
    )

    # 19-23. COA source records.
    run(
        "train_schedule",
        delete(TrainSchedule).where(
            or_(
                TrainSchedule.source_schedule_id.like("SYN-COA-%"),
                TrainSchedule.source_schedule_id.like("REAL-COA-%"),
                TrainSchedule.source_schedule_id.like("SCH-%"),
                TrainSchedule.remarks.like(f"%{MARKER}%")
            )
        ),
    )
    run(
        "train_movement",
        delete(TrainMovement).where(
            or_(
                TrainMovement.source_event_id.like("SYN-COA-%"),
                TrainMovement.source_event_id.like("REAL-COA-%"),
                TrainMovement.source_event_id.like("MOV-%"),
                TrainMovement.remarks.like(f"%{MARKER}%")
            )
        ),
    )
    run(
        "line_occupancy",
        delete(LineOccupancy).where(
            or_(
                LineOccupancy.source_event_id.like("SYN-COA-%"),
                LineOccupancy.source_event_id.like("REAL-%"),
                LineOccupancy.id.in_(junk_occ_ids),
                LineOccupancy.remarks.like(f"%{MARKER}%")
            )
        ),
    )
    run(
        "operational_event",
        delete(OperationalEvent).where(
            or_(
                OperationalEvent.source_event_id.like("SYN-COA-%"),
                OperationalEvent.source_event_id.like("REAL-%"),
                OperationalEvent.remarks.like(f"%{MARKER}%")
            )
        ),
    )
    run("train", delete(Train).where(
        or_(
            Train.train_id.like("SYN-TRAIN-%"),
            Train.train_id.like("TRAIN-%"),
            Train.train_id.like("FREIGHT-%")
        )
    ))

    # 24-26. Source systems' synthetic rows (maintenance after defect/alert).
    run(
        "tms_maintenance",
        delete(TMSMaintenance).where(TMSMaintenance.asset_id.in_(syn_asset_ids)),
    )
    run(
        "tdms_maintenance",
        delete(TDMSMaintenance).where(TDMSMaintenance.asset_id.in_(syn_asset_ids)),
    )
    run(
        "smms_maintenance",
        delete(SMMSMaintenance).where(SMMSMaintenance.asset_id.in_(syn_asset_ids)),
    )
    run("tms_defect", delete(TMSDefect).where(TMSDefect.asset_id.in_(syn_asset_ids)))
    run(
        "tdms_failure",
        delete(TDMSFailure).where(TDMSFailure.asset_id.in_(syn_asset_ids)),
    )
    run(
        "smms_alert",
        delete(SMMSAlert).where(SMMSAlert.asset_id.in_(syn_asset_ids)),
    )
    run(
        "tms_inspection",
        delete(TMSInspection).where(TMSInspection.asset_id.in_(syn_asset_ids)),
    )
    run(
        "tdms_inspection",
        delete(TDMSInspection).where(TDMSInspection.asset_id.in_(syn_asset_ids)),
    )
    run(
        "smms_inspection",
        delete(SMMSInspection).where(SMMSInspection.asset_id.in_(syn_asset_ids)),
    )

    # 27-29. Master data.
    run(
        "asset_parameter",
        delete(AssetParameter).where(AssetParameter.asset_id.in_(syn_asset_ids)),
    )
    run(
        "asset_master",
        delete(AssetMaster).where(
            or_(
                AssetMaster.source_asset_id.like("SYN-%"),
                AssetMaster.location_id.in_(junk_loc_ids),
            )
        ),
    )
    run(
        "location_master",
        delete(LocationMaster).where(
            or_(
                LocationMaster.station_code.like("SYN-ST%"),
                LocationMaster.line_code.like("SYN-L%"),
                LocationMaster.id.in_(junk_loc_ids),
            )
        ),
    )

    db.commit()
    summary = dict(tracking)
    summary["total"] = sum(count for _, count in tracking)
    return summary