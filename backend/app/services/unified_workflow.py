"""Unified Department Maintenance & Planning Workflow Service.

Orchestrates the complete operational lifecycle:
Department request (TDMS/TMS/SMMS)
-> Asset & Location linkage
-> Defect (if provided/new)
-> Maintenance Requirement (Source + Unified)
-> Block Requirement (Station, Line, Duration, Bounds, Flags)
-> Planning Task (Task Code, Duration, Earliest/Latest)
-> Candidate Window evaluation against AvailableWindow
-> Proposed Block Plan + Plan Task
-> Deterministic Plan Validation
-> Ready for Controller Decision
"""

from datetime import datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asset import AssetMaster
from app.models.available_window import AvailableWindow
from app.models.block_plan import BlockPlan
from app.models.block_plan_task import BlockPlanTask
from app.models.block_requirement import BlockRequirement
from app.models.candidate_block_window import CandidateBlockWindow
from app.models.defect_failure import DefectFailure
from app.models.location import LocationMaster
from app.models.maintenance_requirement import MaintenanceRequirement
from app.models.optimization_run import OptimizationRun
from app.models.planning_task import PlanningTask
from app.models.smms_alert import SMMSAlert
from app.models.smms_maintenance import SMMSMaintenance
from app.models.source_system import SourceSystem
from app.models.tdms_failure import TDMSFailure
from app.models.tdms_maintenance import TDMSMaintenance
from app.models.tms_defect import TMSDefect
from app.models.tms_maintenance import TMSMaintenance
from app.schemas.unified import DepartmentMaintenanceRequestCreate
from app.services.candidate_window import evaluate_candidate
from app.services.plan_validation import store_plan_validations


def _get_or_create_source_system(db: Session, code: str) -> SourceSystem:
    source = db.scalar(select(SourceSystem).where(SourceSystem.system_code == code))
    if source is None:
        source = SourceSystem(
            system_code=code,
            system_name=f"{code} System",
            description=f"Unified {code} railway operational subsystem",
        )
        db.add(source)
        db.flush()
    return source


def submit_department_maintenance_request(
    db: Session,
    payload: DepartmentMaintenanceRequestCreate,
) -> dict:
    # 1. Validate Asset
    asset = db.get(AssetMaster, payload.asset_id)
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset #{payload.asset_id} not found in Indian Railways asset registry",
        )

    # 2. Derive Location
    station_code = "AGC"
    line_number = "UP-MAIN"
    if asset.location_id:
        location = db.get(LocationMaster, asset.location_id)
        if location:
            station_code = location.station_code or station_code
            line_number = location.line_code or line_number

    # 3. Determine Source System
    dept_key = payload.department_key.lower().strip()
    if dept_key in ("tdms", "engineering"):
        source_code = "TDMS"
        source_record_type_defect = "TDMS_FAILURE"
        source_record_type_maint = "TDMS_MAINTENANCE"
    elif dept_key == "tms":
        source_code = "TMS"
        source_record_type_defect = "TMS_DEFECT"
        source_record_type_maint = "TMS_MAINTENANCE"
    else:  # smms, signalling, traction
        source_code = "SMMS"
        source_record_type_defect = "SMMS_ALERT"
        source_record_type_maint = "SMMS_MAINTENANCE"

    source = _get_or_create_source_system(db, source_code)

    # Calculate time window defaults if not provided (ensure naive datetime for DB consistency)
    earliest_start = payload.earliest_start
    if earliest_start is not None and earliest_start.tzinfo is not None:
        earliest_start = earliest_start.replace(tzinfo=None)
    if earliest_start is None:
        earliest_start = datetime.combine(payload.planned_date, time(13, 0))

    latest_end = payload.latest_end
    if latest_end is not None and latest_end.tzinfo is not None:
        latest_end = latest_end.replace(tzinfo=None)
    if latest_end is None:
        latest_end = earliest_start + timedelta(minutes=payload.required_duration_minutes)

    # 4. Handle Optional Defect Creation
    source_defect_id = None
    unified_defect_id = payload.defect_id
    if payload.new_defect_code:
        # Create source defect
        if source_code == "TDMS":
            tdms_fail = TDMSFailure(
                asset_id=asset.id,
                failure_code=payload.new_defect_code,
                failure_description=payload.new_defect_description or payload.description,
                severity=payload.new_defect_severity or "HIGH",
                failure_date=earliest_start,
                status="OPEN",
                remarks=f"Logged via {dept_key.upper()} departmental form",
            )
            db.add(tdms_fail)
            db.flush()
            source_defect_id = tdms_fail.id
        elif source_code == "TMS":
            tms_def = TMSDefect(
                asset_id=asset.id,
                defect_code=payload.new_defect_code,
                defect_description=payload.new_defect_description or payload.description,
                severity=payload.new_defect_severity or "HIGH",
                detected_date=earliest_start,
                status="OPEN",
                remarks=f"Logged via {dept_key.upper()} departmental form",
            )
            db.add(tms_def)
            db.flush()
            source_defect_id = tms_def.id
        else:
            smms_alt = SMMSAlert(
                asset_id=asset.id,
                alert_type_code=payload.new_defect_code,
                cause_code=payload.new_defect_description or payload.description,
                incidence_date_time=earliest_start,
                alert_status_code="OPEN",
                remarks=f"Logged via {dept_key.upper()} departmental form",
            )
            db.add(smms_alt)
            db.flush()
            source_defect_id = smms_alt.id

        # Upsert unified DefectFailure
        def_fail = DefectFailure(
            asset_id=asset.id,
            source_system_id=source.id,
            source_record_type=source_record_type_defect,
            source_record_id=source_defect_id,
            defect_code=payload.new_defect_code,
            defect_description=payload.new_defect_description or payload.description,
            severity=payload.new_defect_severity or "HIGH",
            detected_at=earliest_start,
            status="OPEN",
            remarks=f"Originating from {dept_key.upper()}",
        )
        db.add(def_fail)
        db.flush()
        unified_defect_id = def_fail.id

    # 5. Create Source Maintenance Record
    source_maint_id = None
    if source_code == "TDMS":
        tdms_m = TDMSMaintenance(
            asset_id=asset.id,
            failure_id=source_defect_id,
            maintenance_type=payload.maintenance_type,
            remarks=payload.description,
            planned_date=payload.planned_date,
            start_date=earliest_start,
            end_date=latest_end,
            status="PLANNED",
        )
        db.add(tdms_m)
        db.flush()
        source_maint_id = tdms_m.id
    elif source_code == "TMS":
        tms_m = TMSMaintenance(
            asset_id=asset.id,
            defect_id=source_defect_id,
            maintenance_type=payload.maintenance_type,
            remarks=payload.description,
            planned_date=payload.planned_date,
            start_date=earliest_start,
            end_date=latest_end,
            status="PLANNED",
        )
        db.add(tms_m)
        db.flush()
        source_maint_id = tms_m.id
    else:
        smms_m = SMMSMaintenance(
            asset_id=asset.id,
            alert_id=source_defect_id,
            maintenance_type=payload.maintenance_type,
            remarks=payload.description,
            planned_date=payload.planned_date,
            start_date=earliest_start,
            end_date=latest_end,
            status="PLANNED",
        )
        db.add(smms_m)
        db.flush()
        source_maint_id = smms_m.id

    # 6. Create Unified MaintenanceRequirement
    mr = MaintenanceRequirement(
        asset_id=asset.id,
        source_system_id=source.id,
        source_record_type=source_record_type_maint,
        source_record_id=source_maint_id,
        defect_failure_id=unified_defect_id,
        maintenance_type=payload.maintenance_type,
        description=payload.description,
        required_duration_minutes=payload.required_duration_minutes,
        planned_date=payload.planned_date,
        status="REQUIRED",
        remarks=f"Registered by {dept_key.upper()} departmental user",
    )
    db.add(mr)
    db.flush()

    # 7. Create Operational Block Requirement
    block_req = BlockRequirement(
        maintenance_requirement_id=mr.id,
        station_code=station_code,
        line_number=line_number,
        block_type=payload.block_type or "TRAFFIC",
        required_duration_minutes=payload.required_duration_minutes,
        power_block_required=payload.power_block_required,
        traffic_block_required=payload.traffic_block_required,
        earliest_start=earliest_start,
        latest_end=latest_end,
        resource_notes=f"Submitted from {dept_key.upper()} departmental workspace",
        remarks=payload.description,
        status="REQUIRED",
    )
    db.add(block_req)
    db.flush()

    # 8. Create Planning Task
    pt = PlanningTask(
        maintenance_requirement_id=mr.id,
        block_requirement_id=block_req.id,
        asset_id=asset.id,
        task_code=f"PT-{mr.id:06d}",
        task_type=mr.maintenance_type,
        description=mr.description,
        status="OPEN",
        earliest_start=earliest_start,
        latest_end=latest_end,
        duration_minutes=payload.required_duration_minutes,
        location_code=station_code,
    )
    db.add(pt)
    db.flush()

    # 9. Find Matching Available Window & Evaluate Candidate
    aw_stmt = (
        select(AvailableWindow)
        .where(
            AvailableWindow.station_code == station_code,
            AvailableWindow.duration_minutes >= payload.required_duration_minutes,
        )
        .order_by(AvailableWindow.window_start)
    )
    if line_number:
        aw_stmt = aw_stmt.where(AvailableWindow.line_number == line_number)

    available_windows = db.scalars(aw_stmt).all()
    if not available_windows:
        # Fallback to any line at this station
        aw_stmt_fallback = (
            select(AvailableWindow)
            .where(
                AvailableWindow.station_code == station_code,
                AvailableWindow.duration_minutes >= payload.required_duration_minutes,
            )
            .order_by(AvailableWindow.window_start)
        )
        available_windows = db.scalars(aw_stmt_fallback).all()

    cbw = None
    matched_window = None
    if available_windows:
        matched_window = available_windows[0]
        eval_dict = evaluate_candidate(pt, matched_window, block_req)
        cbw = CandidateBlockWindow(
            planning_task_id=pt.id,
            block_requirement_id=block_req.id,
            available_window_id=matched_window.id,
            candidate_start=eval_dict["candidate_start"],
            candidate_end=eval_dict["candidate_end"],
            candidate_duration_minutes=eval_dict["candidate_duration_minutes"],
            feasible=True,
            feasibility_status="FEASIBLE",
            feasibility_reason="FEASIBLE_TEMPORAL_MATCH",
        )
        db.add(cbw)
        db.flush()

    # 10. Generate Proposed Block Plan for Controller Review
    plan = None
    if cbw and matched_window:
        run = db.query(OptimizationRun).first()
        plan_code = f"PLAN-DEPT-{mr.id:04d}"
        # Ensure code is unique
        existing_plan = db.scalar(select(BlockPlan).where(BlockPlan.plan_code == plan_code))
        if existing_plan:
            plan_code = f"PLAN-DEPT-{mr.id:04d}-{int(datetime.utcnow().timestamp()) % 1000}"

        plan = BlockPlan(
            optimization_run_id=run.id if run else None,
            plan_code=plan_code,
            plan_date=cbw.candidate_start.date(),
            status="PROPOSED",
            planning_horizon_start=cbw.candidate_start,
            planning_horizon_end=cbw.candidate_end,
            description=f"{dept_key.upper()} Block for {asset.asset_name} ({pt.task_code}) at {station_code} ({line_number}). Duration: {cbw.candidate_duration_minutes}m.",
        )
        db.add(plan)
        db.flush()

        plan_task = BlockPlanTask(
            block_plan_id=plan.id,
            planning_task_id=pt.id,
            candidate_block_window_id=cbw.id,
            planned_start=cbw.candidate_start,
            planned_end=cbw.candidate_end,
            planned_duration_minutes=cbw.candidate_duration_minutes,
            sequence_number=1,
            status="PROPOSED",
            remarks=f"Auto-generated proposal for {dept_key.upper()} request. Placed in window #{matched_window.id} ({station_code} {line_number}).",
        )
        db.add(plan_task)
        db.flush()

        # Run deterministic validation
        store_plan_validations(db, plan.id)

    db.commit()

    return {
        "success": True,
        "maintenance_requirement_id": mr.id,
        "block_requirement_id": block_req.id,
        "planning_task_id": pt.id,
        "planning_task_code": pt.task_code,
        "candidate_block_window_id": cbw.id if cbw else None,
        "block_plan_id": plan.id if plan else None,
        "plan_code": plan.plan_code if plan else None,
        "plan_status": plan.status if plan else "AWAITING_WINDOW",
        "defect_id": unified_defect_id,
        "message": (
            f"Requirement registered successfully as Block Requirement BR-{block_req.id}. "
            + (
                f"Proposed block plan {plan.plan_code} generated and submitted to Section Controller for review."
                if plan
                else "Registered for candidate window scheduling."
            )
        ),
    }
