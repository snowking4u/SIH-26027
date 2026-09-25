
# Phase 2 - Real-Data Integration Plan (SIH 26027, Controller)
Prepared: after a full read-only OpenAPI audit + live endpoint probes.

## 1. Findings (this changes the earlier "no endpoint exists" assumption)

Audit of the LIVE backend (run in read-only mode; two mutation probes were
needed to prove persistence and have been cleaned up):

- TOTAL OpenAPI operations: 119 (only ~20 were probed in the earlier audit).
- Real mutation endpoints DO exist and persist:
  - POST /api/optimization/plans          -> created plan id=6 (DRAFT), then GET confirmed it persisted. REAL.
  - POST /api/unified/block-requirements   -> truthful validation (422 when body invalid). NO silent fake.
- Real derived data exists end-to-end:
  - GET /api/coa/available-windows        -> rows with calculation_source=DETERMINISTIC:...
  - GET /api/candidates/windows           -> rows with feasibility_status / feasibility_reason
  - GET /api/planning/tasks               -> real planning-task records
  - GET /api/optimization/plans           -> real persisted block plans
- The backend exposes NO "block request approval / handoff" mutation endpoint
  in this surface. There is no distinct block-request handoff API.

## 2. Decision (per user rule: "use the real API, never invent")

- Block plan creation (Controller/Planning "Create a block plan") -> wired to
  the REAL POST /api/optimization/plans. Not a placeholder, because the
  endpoint exists and persists.
- Block request HANOFF to Controller (Engineering/S&T/Traction department
  workspace) -> NO handoff endpoint exists. Honest placeholder screen:
  clearly labeled "Block request submission not yet available" with real
  context data shown, and NO fake success/failure.

## 3. Services layer (all typed against real OpenAPI models)

Files to create/complete in frontend/src/services/api/:
- client.ts (done - canonical ListParams + apiGet/apiPost/isAxiosError/apiErrorMessage)
- types.ts (done - all typed domain models)
- health.ts (done)
- coa.ts (done - trains/movements/schedules/line-occupancy/available-windows)
- planning.ts (done - tasks/constraints/resources/task-resources/dependencies)
- NEW: tdms.ts       -> failures/inspections/maintenance
- NEW: tms.ts        -> defects/inspections/maintenance
- NEW: smms.ts       -> alerts/inspections/maintenance
- NEW: unified.ts    -> defects/maintenance/block-requirements/normalize
- NEW: candidates.ts -> windows/check/generate
- NEW: optimization.ts -> plans/plan-tasks/validate/priority/recalculate

## 4. Docs

- services/api/types.ts -> full typed domain models
- services/api/client.ts -> ListParams + API helpers
- Block-request placeholder screen wire-up for Controller workspace
