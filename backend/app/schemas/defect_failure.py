from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DefectFailureUpdate(BaseModel):
    status: str | None = None
    rectified_at: datetime | None = None
    remarks: str | None = None


class DefectFailureCreate(BaseModel):
    asset_id: int
    source_system_id: int
    source_record_type: str = "MANUAL_DEFECT"
    source_record_id: int = 0
    defect_code: str
    defect_description: str | None = None
    severity: str | None = "MEDIUM"
    detected_at: datetime | None = None
    status: str = "OPEN"
    remarks: str | None = None


class DefectFailureResponse(BaseModel):
    id: int
    asset_id: int
    source_system_id: int
    source_record_type: str
    source_record_id: int
    defect_code: str | None = None
    defect_description: str | None = None
    severity: str | None = None
    detected_at: datetime
    status: str
    rectified_at: datetime | None = None
    remarks: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)