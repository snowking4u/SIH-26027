$ErrorActionPreference = 'Stop'
$apiRoot = 'D:\projects\SIH_26027_database\frontend\src\services\api\'
$typesPath = $apiRoot + 'types.ts'

# ---- READ current types.ts ----
$typesLines = [System.IO.File]::ReadAllLines($typesPath)
$typesText = ($typesLines -join "`r`n")

# ---- DEFINE the new real interfaces to ADD (fields from live OpenAPI components) ----
$ADD = @'

export interface TmsInspection {
  asset_id: number;
  inspection_date: string;
  inspection_type: string;
  parameter_code: string;
  parameter_value: unknown;
  remarks: unknown;
  id: number;
}

export interface TmsMaintenance {
  asset_id: number;
  defect_id: number;
  maintenance_type: string;
  planned_date: unknown;
  start_date: unknown;
  end_date: unknown;
  status: string;
  remarks: unknown;
  id: number;
}

export interface SmmsInspection {
  asset_id: number;
  inspection_date: string;
  inspection_type: string;
  parameter_code: string;
  parameter_value: unknown;
  remarks: unknown;
  id: number;
}

export interface SmmsMaintenance {
  asset_id: number;
  alert_id: unknown;
  maintenance_type: string;
  planned_date: unknown;
  start_date: unknown;
  end_date: unknown;
  status: string;
  remarks: unknown;
  id: number;
}

export interface SmmsMaintenanceCreate {
  asset_id: number;
  alert_id: unknown;
  maintenance_type: string;
  planned_date: unknown;
  start_date: unknown;
  end_date: unknown;
  status: string;
  remarks: unknown;
}

export interface BlockRequirementCreate {
  maintenance_requirement_id: number;
  station_code: unknown;
  line_number: unknown;
  block_type: string;
  required_duration_minutes: unknown;
  earliest_start: unknown;
  latest_end: unknown;
  power_block_required: boolean;
  traffic_block_required: boolean;
  resource_notes: unknown;
  status: string;
  remarks: unknown;
}

export interface CandidateCheckRequest {
  planning_task_id: number;
  available_window_id: number;
}

export interface CandidateCheckResponse {
  planning_task_id: number;
  block_requirement_id: unknown;
  available_window_id: number;
  candidate_start: string;
  candidate_end: string;
  candidate_duration_minutes: number;
  feasible: boolean;
  feasibility_status: string;
  feasibility_reason: unknown;
  existing_candidate_id: unknown;
}

export interface CandidateGenerationSummary {
  processed: number;
  created: number;
  skipped: number;
  infeasible: number;
  requires_review: number;
}

export interface CandidateBlockWindow {
  planning_task_id: number;
  block_requirement_id: unknown;
  available_window_id: number;
  candidate_start: string;
  candidate_end: string;
  candidate_duration_minutes: number;
  feasible: boolean;
  feasibility_status: string;
  feasibility_reason: unknown;
  id: number;
  created_at: string;
  updated_at: string;
}

export interface BlockPlan {
  optimization_run_id: unknown;
  plan_code: string;
  plan_date: string;
  status: string;
  planning_horizon_start: string;
  planning_horizon_end: string;
  description: unknown;
  id: number;
  created_at: string;
  updated_at: string;
}

export interface BlockPlanCreate {
  optimization_run_id: unknown;
  plan_code: string;
  plan_date: string;
  status: string;
  planning_horizon_start: string;
  planning_horizon_end: string;
  description: unknown;
}

export interface PlanValidation {
  block_plan_id: number;
  validation_type: string;
  validation_status: string;
  validation_message: unknown;
  validator_version: unknown;
  id: number;
  validated_at: string;
  created_at: string;
}

export interface ControllerDecision {
  block_plan_id: number;
  decision: string;
  controller_code: unknown;
  remarks: unknown;
  id: number;
  decided_at: string;
  created_at: string;
}

export interface OptimizationInput {
  optimization_run_id: number;
  planning_task_id: unknown;
  candidate_block_window_id: unknown;
  planning_constraint_id: unknown;
  planning_resource_id: unknown;
  task_dependency_id: unknown;
  input_role: string;
  id: number;
  created_at: string;
}

export interface OptimizationOutput {
  optimization_run_id: number;
  planning_task_id: unknown;
  candidate_block_window_id: unknown;
  output_type: string;
  output_status: string;
  selected: boolean;
  output_payload: unknown;
  id: number;
  created_at: string;
}

export interface OptimizationRun {
  run_code: string;
  run_type: string;
  status: string;
  started_at: unknown;
  completed_at: unknown;
  model_name: unknown;
  model_version: unknown;
  input_snapshot_hash: unknown;
  output_snapshot_hash: unknown;
  objective_description: unknown;
  error_message: unknown;
  id: number;
  requested_at: string;
  created_at: string;
  updated_at: string;
}
'@

# Append the new interfaces before the final re-export block if any, else at end.
$typesText = $typesText.TrimEnd() + "`r`n" + $ADD + "`r`n"

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($typesPath, $typesText, $enc)
'types.ts updated with real component interfaces'
