from datetime import date, datetime
from pydantic import BaseModel, Field


class NormalizeSummary(BaseModel):
    processed: int = 0
    created: int = 0
    updated: int = 0
    skipped: int = 0


class MaintenanceRequirementUpdate(BaseModel):
    status: str | None = None
    remarks: str | None = None


class DepartmentMaintenanceRequestCreate(BaseModel):
    department_key: str = Field(description="tdms | tms | smms | engineering | signalling | traction")
    asset_id: int
    maintenance_type: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=2)
    required_duration_minutes: int = Field(gt=0, le=1440)
    planned_date: date
    earliest_start: datetime | None = None
    latest_end: datetime | None = None
    power_block_required: bool = False
    traffic_block_required: bool = True
    block_type: str = "TRAFFIC"
    defect_id: int | None = None
    new_defect_code: str | None = None
    new_defect_description: str | None = None
    new_defect_severity: str | None = "MEDIUM"


class DepartmentMaintenanceRequestResponse(BaseModel):
    success: bool
    maintenance_requirement_id: int
    block_requirement_id: int
    planning_task_id: int
    planning_task_code: str
    candidate_block_window_id: int | None = None
    block_plan_id: int | None = None
    plan_code: str | None = None
    plan_status: str | None = None
    defect_id: int | None = None
    message: str