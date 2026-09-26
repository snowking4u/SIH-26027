"""Controller reject -> planning rework workflow.

A controller rejection is persisted as a ``controller_decision`` (REJECTED,
with the rejection reason in ``remarks``) and flips the plan into
``REWORK_REQUIRED`` status. The rejected plan and its full audit chain
(block plan tasks, validations, decisions) are NEVER deleted or altered beyond
that status flip.

Planning generates a revised recommendation as a brand-new ``block_plan`` row
linked back to the original through ``revises_plan_id``. Revising does not
invent any planning values: the revised plan clones the persisted original
proposal, or — when the planner supplies an alternative feasible candidate
window — adopts that candidate window's own authoritative start/end/duration.
"""

from datetime import timedelta
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.block_plan import BlockPlan
from app.models.block_plan_task import BlockPlanTask
from app.models.candidate_block_window import CandidateBlockWindow
from app.models.controller_decision import ControllerDecision
from app.models.planning_task import PlanningTask
from app.schemas.block_plan import REWORK_REQUIRED
from app.services.plan_validation import store_plan_validations

REJECT_DECISION = "REJECTED"
RESUBMIT_STATUS = "PROPOSED"
REWORKABLE_STATUSES = ("DRAFT", "PROPOSED", "VALIDATED", "SUBMITTED", REWORK_REQUIRED)


def reject_block_plan(db: Session, plan: BlockPlan) -> None:
    """Transition a plan into the planning rework queue on rejection."""
    if plan.status == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An approved block plan cannot be rejected",
        )
    if plan.status not in REWORKABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reject a block plan in {plan.status} status",
        )
    plan.status = REWORK_REQUIRED


def latest_rejection(db: Session, plan_id: int) -> ControllerDecision | None:
    """Most recent REJECTED decision for a plan (holds the rejection reason)."""
    return db.scalar(
        select(ControllerDecision)
        .where(
            ControllerDecision.block_plan_id == plan_id,
            ControllerDecision.decision == REJECT_DECISION,
        )
        .order_by(
            ControllerDecision.decided_at.desc(),
            ControllerDecision.id.desc(),
        )
        .limit(1)
    )


def revise_block_plan(
    db: Session,
    plan_id: int,
    *,
    description: str | None = None,
    candidate_block_window_id: int | None = None,
) -> BlockPlan:
    """Create a revised block recommendation linked to the rejected original.

    Raises ``ValueError`` when the original plan does not exist (router maps it
    to 404). Raises ``HTTPException`` for domain violations so invalid rework
    states never silently succeed.
    """
    plan = db.get(BlockPlan, plan_id)
    if plan is None:
        raise ValueError("Block plan not found")
    if plan.status != REWORK_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Block plan must be in REWORK_REQUIRED status before it can "
                "be revised"
            ),
        )
    if latest_rejection(db, plan.id) is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No controller rejection is recorded for this plan; a "
                "rejection reason must exist before revising"
            ),
        )

    plan_tasks = db.scalars(
        select(BlockPlanTask)
        .where(BlockPlanTask.block_plan_id == plan.id)
        .order_by(BlockPlanTask.id)
    ).all()

    planning_task_ids = [pt.planning_task_id for pt in plan_tasks]
    planning_tasks = {}
    if planning_task_ids:
        planning_tasks = {
            pt.id: pt
            for pt in db.scalars(
                select(PlanningTask).where(PlanningTask.id.in_(planning_task_ids))
            ).all()
        }

    alternate: CandidateBlockWindow | None = None
    if candidate_block_window_id is not None:
        alternate = db.get(CandidateBlockWindow, candidate_block_window_id)
        if alternate is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate block window not found",
            )
        if not alternate.feasible:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Alternative candidate window is not feasible",
            )
        if len(plan_tasks) != 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "An alternative candidate window can only be applied to a "
                    "single-task plan"
                ),
            )
        if plan_tasks[0].planning_task_id != alternate.planning_task_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Alternative candidate window belongs to a different "
                    "planning task"
                ),
            )

    revision_no = len(
        db.scalars(
            select(BlockPlan).where(BlockPlan.revises_plan_id == plan.id)
        ).all()
    )
    base_code = f"{plan.plan_code}-R{revision_no + 1}"
    plan_code = base_code
    suffix = 1
    while db.scalar(
        select(BlockPlan).where(BlockPlan.plan_code == plan_code)
    ) is not None:
        plan_code = f"{base_code}-{suffix}"
        suffix += 1

    revised = BlockPlan(
        optimization_run_id=plan.optimization_run_id,
        revises_plan_id=plan.id,
        plan_code=plan_code,
        plan_date=plan.plan_date,
        status=RESUBMIT_STATUS,
        planning_horizon_start=plan.planning_horizon_start,
        planning_horizon_end=plan.planning_horizon_end,
        description=(
            description
            or (
                "Revised recommendation after controller rejection of "
                f"{plan.plan_code}."
            )
        ),
    )
    db.add(revised)
    db.flush()

    for task in plan_tasks:
        planning_task = planning_tasks.get(task.planning_task_id)
        block = planning_task.block_requirement if planning_task else None

        # Determine the required duration from the planning task or block requirement
        required_duration = None
        if planning_task is not None:
            if planning_task.duration_minutes is not None and planning_task.duration_minutes > 0:
                required_duration = planning_task.duration_minutes
            elif block is not None and block.required_duration_minutes is not None and block.required_duration_minutes > 0:
                required_duration = block.required_duration_minutes

        if alternate is not None:
            planned_start = alternate.candidate_start
            planned_end = alternate.candidate_end
            planned_duration = alternate.candidate_duration_minutes
            candidate_id = alternate.id
        else:
            # When cloning without an alternate, use the required duration to compute
            # the planned interval from the original start time. This prevents
            # propagating a possibly incorrect duration from the rejected plan.
            planned_start = task.planned_start
            if required_duration is not None:
                planned_duration = required_duration
                planned_end = planned_start + timedelta(minutes=required_duration)
            else:
                planned_duration = task.planned_duration_minutes
                planned_end = task.planned_end
            candidate_id = task.candidate_block_window_id
        db.add(
            BlockPlanTask(
                block_plan_id=revised.id,
                planning_task_id=task.planning_task_id,
                candidate_block_window_id=candidate_id,
                planned_start=planned_start,
                planned_end=planned_end,
                planned_duration_minutes=planned_duration,
                sequence_number=task.sequence_number,
                status="PROPOSED",
                remarks=f"Cloned per controller rework of {plan.plan_code}.",
            )
        )
    db.flush()

    # Deterministic validation against the current persisted state; never
    # rewards, optimizes or approves — the revised plan still needs the
    # controller decision step.
    store_plan_validations(db, revised.id)
    db.refresh(revised)
    return revised