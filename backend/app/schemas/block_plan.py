from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

REWORK_REQUIRED = "REWORK_REQUIRED"

BlockPlanStatus = Literal[
    "DRAFT",
    "PROPOSED",
    "VALIDATED",
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    REWORK_REQUIRED,
    "EXECUTED",
    "CANCELLED",
]


class BlockPlanBase(BaseModel):
    optimization_run_id: int | None = None
    revises_plan_id: int | None = None
    plan_code: str = Field(min_length=1, max_length=100)
    plan_date: date
    status: BlockPlanStatus
    planning_horizon_start: datetime
    planning_horizon_end: datetime
    description: str | None = None


class PlanReviseRequest(BaseModel):
    """Planning-side rework action producing a revised block recommendation.

    ``candidate_block_window_id`` is optional. When provided it must be a
    feasible candidate for the original plan's planning task (single-task
    plans only) and is used as the revised plan task's window, replacing the
    previously rejected one. No planning values are invented — the candidate
    window's own start/end/duration are authoritative.
    """

    description: str | None = None
    candidate_block_window_id: int | None = None


class BlockPlanCreate(BlockPlanBase):
    @model_validator(mode="after")
    def validate_horizon(self):
        if self.planning_horizon_start >= self.planning_horizon_end:
            raise ValueError(
                "planning_horizon_start must be earlier than planning_horizon_end"
            )
        return self


class BlockPlanResponse(BlockPlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
