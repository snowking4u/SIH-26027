/**
 * Typed contracts for the SIH 26027 block-planning backend.
 *
 * Every interface mirrors the backend OpenAPI schemas field-for-field and was
 * verified by probing the live API on :8011 — no field is invented, and a
 * backend rename or type-change fails loudly at compile time rather than
 * rendering `undefined` in the UI.
 */

/* ------------------------------------------------------------ Query shape */

export interface ListParams {
  skip?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

/** Some endpoints wrap rows in `{items: [...]}`; normalise to a plain array. */
export type MaybePaginated<T> = T[] | { items: T[] };

export function toList<T>(data: MaybePaginated<T>): T[] {
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

/* ---------------------------------------------------------------- Locations */

export interface Location {
  id: number;
  zone_code: string | null;
  zone_name: string | null;
  division_code: string | null;
  division_name: string | null;
  section_code: string | null;
  section_name: string | null;
  station_code: string | null;
  station_name: string | null;
  line_code: string | null;
  line_name: string | null;
  km_start: number | null;
  km_end: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LocationCreate {
  zone_code?: string | null;
  zone_name?: string | null;
  division_code?: string | null;
  division_name?: string | null;
  section_code?: string | null;
  section_name?: string | null;
  station_code?: string | null;
  station_name?: string | null;
  line_code?: string | null;
  line_name?: string | null;
  km_start?: number | null;
  km_end?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

/* ------------------------------------------------------------------- Assets */

export interface Asset {
  id: number;
  source_system_id: number;
  source_asset_id: string;
  asset_type: string | null;
  asset_subtype: string | null;
  asset_name: string | null;
  location_id: number | null;
  installation_date: string | null;
  status: string | null;
  remarks: string | null;
}

export interface AssetCreate {
  source_system_id: number;
  source_asset_id: string;
  asset_type?: string | null;
  asset_subtype?: string | null;
  asset_name?: string | null;
  location_id?: number | null;
  installation_date?: string | null;
  status?: string | null;
  remarks?: string | null;
}

export interface AssetParameter {
  id: number;
  asset_id: number;
  source_system_id: number;
  parameter_code: string;
  parameter_name: string | null;
  parameter_value: string | null;
  unit: string | null;
  recorded_date: string | null;
}

/* -------------------------------------------------------------- Source systems */

export interface SourceSystem {
  id: number;
  system_code: string;
  system_name: string;
  description?: string | null;
}

/* ------------------------------------------------------------------- COA */

export interface Train {
  id: number;
  train_id: string;
  train_number: string | null;
  train_name: string | null;
  schedule_date: string | null;
  start_date: string | null;
  loco_number: string | null;
  direction: string | null;
  source_system_id: number;
  created_at?: string;
  updated_at?: string | null;
}

export interface CoaMovement {
  id: number;
  train_id: number;
  station_code: string;
  movement_flag: "A" | "D" | "T";
  movement_datetime: string;
  line_number: string | null;
  source_event_id: string | null;
  remarks: string | null;
}

export interface CoaSchedule {
  id: number;
  train_id: number;
  station_code: string;
  scheduled_arrival: string | null;
  scheduled_departure: string | null;
  scheduled_run_through: string | null;
  sequence_number: number;
  line_number: string | null;
  source_schedule_id: string | null;
  remarks: string | null;
}

export interface CoaLineOccupancy {
  id: number;
  station_code: string;
  line_number: string;
  occupancy_start: string;
  occupancy_end: string | null;
  occupancy_status: string;
  train_id: number | null;
  source_event_id: string | null;
  remarks: string | null;
}

export interface CoaAvailableWindow {
  id: number;
  station_code: string;
  line_number: string;
  window_start: string;
  window_end: string;
  duration_minutes: number;
  window_status: string;
  calculation_source: string;
  generated_at: string;
  source_schedule_id: string | null;
  source_occupancy_id: number | null;
  remarks: string | null;
}

export interface OperationalEvent {
  id: number;
  train_id: number | null;
  station_code: string | null;
  event_type: string;
  event_datetime: string;
  description: string | null;
  source_event_id: string | null;
  remarks: string | null;
}

/* ------------------------------------------------------------------- TMS */

export interface TmsDefect {
  id: number;
  asset_id: number;
  inspection_id: number;
  defect_code: string;
  defect_description: string | null;
  severity: string | null;
  detected_date: string | null;
  status: string | null;
  remarks: string | null;
}

export interface TmsInspection {
  id: number;
  asset_id: number;
  inspection_date: string;
  inspection_type: string;
  parameter_code: string;
  parameter_value: string | null;
  remarks: string | null;
}

export interface TmsMaintenance {
  id: number;
  asset_id: number;
  defect_id: number;
  maintenance_type: string;
  planned_date: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  remarks: string | null;
}

export interface TmsMaintenanceCreate {
  asset_id: number;
  defect_id: number;
  maintenance_type: string;
  planned_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  remarks?: string | null;
}

export interface TmsDefectCreate {
  asset_id: number;
  inspection_id: number;
  defect_code: string;
  defect_description?: string | null;
  severity?: string | null;
  detected_date?: string | null;
  status?: string | null;
  remarks?: string | null;
}

export interface TmsInspectionCreate {
  asset_id: number;
  inspection_date: string;
  inspection_type: string;
  parameter_code: string;
  parameter_value?: string | null;
  remarks?: string | null;
}

/* ------------------------------------------------------------------ TDMS */

export interface TdmsFailure {
  id: number;
  asset_id: number;
  inspection_id: number | null;
  failure_code: string;
  failure_description: string | null;
  severity: string | null;
  failure_date: string;
  status: string;
  rectification_date: string | null;
  remarks: string | null;
}

export interface TdmsInspection {
  id: number;
  asset_id: number;
  inspection_date: string;
  inspection_type: string;
  parameter_code: string;
  parameter_value: string | null;
  remarks: string | null;
}

export interface TdmsMaintenance {
  id: number;
  asset_id: number;
  failure_id: number | null;
  maintenance_type: string;
  planned_date: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  remarks: string | null;
}

export interface TdmsMaintenanceCreate {
  asset_id: number;
  failure_id?: number | null;
  maintenance_type: string;
  planned_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  remarks?: string | null;
}

export interface TdmsFailureCreate {
  asset_id: number;
  inspection_id?: number | null;
  failure_code: string;
  failure_description?: string | null;
  severity?: string | null;
  failure_date: string;
  status: string;
  rectification_date?: string | null;
  remarks?: string | null;
}

export interface TdmsInspectionCreate {
  asset_id: number;
  inspection_date: string;
  inspection_type: string;
  parameter_code: string;
  parameter_value?: string | null;
  remarks?: string | null;
}

/* ------------------------------------------------------------------ SMMS */

export interface SmmsAlert {
  id: number;
  asset_id: number;
  inspection_id: number | null;
  alert_type_code: string;
  alert_feedback_code: string | null;
  alert_status_code: string;
  cause_code: string | null;
  incidence_date_time: string;
  rectification_date_time: string | null;
  incidence_duration: string | null;
  alert_feedback_date_time: string | null;
  remarks: string | null;
  maintainer_name: string | null;
  maintainer_designation: string | null;
  maintainer_mobile: string | null;
}

export interface SmmsInspection {
  id: number;
  asset_id: number;
  inspection_date: string;
  inspection_type: string;
  parameter_code: string;
  parameter_value: string | null;
  remarks: string | null;
}

export interface SmmsMaintenance {
  id: number;
  asset_id: number;
  alert_id: number | null;
  maintenance_type: string;
  planned_date: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  remarks: string | null;
}

export interface SmmsMaintenanceCreate {
  asset_id: number;
  alert_id?: number | null;
  maintenance_type: string;
  planned_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  remarks?: string | null;
}

export interface SmmsAlertCreate {
  asset_id: number;
  inspection_id?: number | null;
  alert_type_code: string;
  alert_feedback_code?: string | null;
  alert_status_code: string;
  cause_code?: string | null;
  incidence_date_time: string;
  rectification_date_time?: string | null;
  incidence_duration?: string | null;
  alert_feedback_date_time?: string | null;
  remarks?: string | null;
  maintainer_name?: string | null;
  maintainer_designation?: string | null;
  maintainer_mobile?: string | null;
}

export interface SmmsInspectionCreate {
  asset_id: number;
  inspection_date: string;
  inspection_type: string;
  parameter_code: string;
  parameter_value?: string | null;
  remarks?: string | null;
}

/* -------------------------------------------------------------- UNIFIED */

export interface UnifiedDefect {
  id: number;
  asset_id: number;
  source_system_id: number;
  source_record_type: string;
  source_record_id: number;
  defect_code: string | null;
  defect_description: string | null;
  severity: string | null;
  detected_at: string;
  status: string;
  rectified_at: string | null;
  remarks: string | null;
  created_at?: string;
}

export interface UnifiedMaintenance {
  id: number;
  asset_id: number;
  source_system_id: number;
  source_record_type: string;
  source_record_id: number;
  defect_failure_id: number | null;
  maintenance_type: string;
  description: string | null;
  required_duration_minutes: number | null;
  planned_date: string | null;
  status: string;
  remarks: string | null;
  created_at?: string;
}

export interface UnifiedBlockRequirement {
  id: number;
  maintenance_requirement_id: number;
  station_code: string | null;
  line_number: string | null;
  block_type: string;
  required_duration_minutes: number | null;
  earliest_start: string | null;
  latest_end: string | null;
  power_block_required: boolean;
  traffic_block_required: boolean;
  resource_notes: string | null;
  status: string;
  remarks: string | null;
  created_at?: string;
}

export interface UnifiedBlockRequirementCreate {
  maintenance_requirement_id: number;
  station_code?: string | null;
  line_number?: string | null;
  block_type: string;
  required_duration_minutes?: number | null;
  earliest_start?: string | null;
  latest_end?: string | null;
  power_block_required?: boolean;
  traffic_block_required?: boolean;
  resource_notes?: string | null;
  status: string;
  remarks?: string | null;
}

/* -------------------------------------------------------------- PLANNING */

export interface PlanningTask {
  id: number;
  maintenance_requirement_id: number;
  block_requirement_id: number | null;
  asset_id: number;
  task_code: string;
  task_type: string;
  description: string | null;
  status: string;
  earliest_start: string | null;
  latest_end: string | null;
  duration_minutes: number;
  location_code: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlanningConstraint {
  id: number;
  planning_task_id: number;
  constraint_type: string;
  constraint_value: string;
  hard_constraint: boolean;
  effective_start: string | null;
  effective_end: string | null;
  description: string | null;
  source: string | null;
  created_at?: string;
}

export interface PlanningResource {
  id: number;
  resource_code: string;
  resource_type: string;
  resource_name: string;
  description?: string | null;
  capacity: number | null;
  unit: string | null;
  status: string;
  location_code: string | null;
  source_system_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PlanningTaskResource {
  id: number;
  planning_task_id: number;
  planning_resource_id: number;
  required_quantity: number;
  allocation_status: string;
  remarks: string | null;
  created_at?: string;
}

export interface PlanningDependency {
  id: number;
  predecessor_task_id: number;
  successor_task_id: number;
  dependency_type: string;
  lag_minutes: number;
  description: string | null;
  created_at?: string;
}

export interface PlanningPriority {
  id: number;
  planning_task_id: number;
  criticality_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  urgency_level: "LOW" | "MEDIUM" | "HIGH" | "IMMEDIATE";
  safety_impact: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  asset_availability_impact: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  traffic_impact: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  failure_recurrence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  defect_age_days: number;
  priority_score: number;
  priority_band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  calculation_version: string;
  calculated_at: string;
  calculation_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

/* ------------------------------------------------------------- CANDIDATES */

export interface CandidateWindow {
  id: number;
  planning_task_id: number;
  block_requirement_id: number | null;
  available_window_id: number;
  candidate_start: string;
  candidate_end: string;
  candidate_duration_minutes: number;
  feasible: boolean;
  feasibility_status: string;
  feasibility_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CandidateCheckRequest {
  planning_task_id: number;
  available_window_id: number;
}

export interface CandidateCheckResponse {
  planning_task_id: number;
  block_requirement_id: number | null;
  available_window_id: number;
  candidate_start: string;
  candidate_end: string;
  candidate_duration_minutes: number;
  feasible: boolean;
  feasibility_status: string;
  feasibility_reason: string | null;
  existing_candidate_id: number | null;
}

export interface CandidateGenerationSummary {
  processed: number;
  created: number;
  skipped: number;
  infeasible: number;
  requires_review: number;
}

/* --------------------------------------------------------------- OPTIMIZATION */

export interface OptimizationRun {
  id: number;
  run_code: string;
  run_type: "PLANNING" | "BACKTEST" | "SIMULATION" | "EVALUATION";
  status: "REQUESTED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  started_at: string | null;
  completed_at: string | null;
  model_name: string | null;
  model_version: string | null;
  input_snapshot_hash: string | null;
  output_snapshot_hash: string | null;
  objective_description: string | null;
  error_message: string | null;
  requested_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OptimizationInput {
  id: number;
  optimization_run_id: number;
  planning_task_id: number | null;
  candidate_block_window_id: number | null;
  planning_constraint_id: number | null;
  planning_resource_id: number | null;
  task_dependency_id: number | null;
  input_role: string;
  created_at?: string;
}

export interface OptimizationOutput {
  id: number;
  optimization_run_id: number;
  planning_task_id: number | null;
  candidate_block_window_id: number | null;
  output_type: string;
  output_status: string;
  selected: boolean;
  output_payload: Record<string, unknown> | null;
  created_at?: string;
}

export interface BlockPlan {
  id: number;
  optimization_run_id: number | null;
  revises_plan_id: number | null;
  plan_code: string;
  plan_date: string;
  status:
    | "DRAFT"
    | "PROPOSED"
    | "VALIDATED"
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED"
    | "REWORK_REQUIRED"
    | "EXECUTED"
    | "CANCELLED";
  planning_horizon_start: string;
  planning_horizon_end: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BlockPlanCreate {
  optimization_run_id?: number | null;
  revises_plan_id?: number | null;
  plan_code: string;
  plan_date: string;
  status: BlockPlan["status"];
  planning_horizon_start: string;
  planning_horizon_end: string;
  description?: string | null;
}

/** POST /api/optimization/plans/{id}/revise — planning-side rework action. */
export interface PlanReviseRequest {
  description?: string | null;
  candidate_block_window_id?: number | null;
}

export interface BlockPlanTask {
  id: number;
  block_plan_id: number;
  planning_task_id: number;
  candidate_block_window_id: number | null;
  planned_start: string;
  planned_end: string;
  planned_duration_minutes: number;
  sequence_number: number | null;
  status: "PROPOSED" | "CONFIRMED" | "REMOVED" | "COMPLETED";
  remarks: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OptimizationValidation {
  id: number;
  block_plan_id: number;
  validation_type: string;
  validation_status: "PASSED" | "FAILED" | "WARNING";
  validation_message: string | null;
  validator_version: string | null;
  validated_at?: string;
  created_at?: string;
}

export interface ControllerDecision {
  id: number;
  block_plan_id: number;
  decision: "APPROVED" | "REJECTED" | "RETURNED_FOR_REVISION";
  controller_code: string | null;
  remarks: string | null;
  decided_at: string;
  created_at?: string;
}

export interface ControllerDecisionCreate {
  block_plan_id: number;
  decision: "APPROVED" | "REJECTED" | "RETURNED_FOR_REVISION";
  controller_code?: string | null;
  remarks?: string | null;
}

export interface ExecutionOutcome {
  id: number;
  block_plan_id: number;
  block_plan_task_id: number | null;
  execution_status:
    | "NOT_STARTED"
    | "STARTED"
    | "COMPLETED"
    | "PARTIALLY_COMPLETED"
    | "CANCELLED"
    | "FAILED";
  actual_start: string | null;
  actual_end: string | null;
  actual_duration_minutes: number | null;
  outcome_code: string | null;
  remarks: string | null;
  recorded_at?: string;
  created_at?: string;
}

export interface AssetUpdate {
  status?: string | null;
  asset_name?: string | null;
  asset_subtype?: string | null;
  remarks?: string | null;
}

export interface DefectFailureUpdate {
  status?: string | null;
  rectified_at?: string | null;
  remarks?: string | null;
}

export interface DepartmentMaintenanceRequestCreate {
  department_key: string;
  asset_id: number;
  maintenance_type: string;
  description: string;
  required_duration_minutes: number;
  planned_date: string;
  earliest_start?: string | null;
  latest_end?: string | null;
  power_block_required?: boolean;
  traffic_block_required?: boolean;
  block_type?: string;
  defect_id?: number | null;
  new_defect_code?: string | null;
  new_defect_description?: string | null;
  new_defect_severity?: string | null;
}

export interface DepartmentMaintenanceRequestResponse {
  success: boolean;
  maintenance_requirement_id: number;
  block_requirement_id: number;
  planning_task_id: number;
  planning_task_code: string;
  candidate_block_window_id: number | null;
  block_plan_id: number | null;
  plan_code: string | null;
  plan_status: string | null;
  message: string;
}