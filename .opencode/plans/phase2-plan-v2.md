# Phase 2 - Real Block-Planning Data Integration (SIH 26027)

## 0. Ground truth established (live probes, no inference)
- 119/119 OpenAPI operations enumerated; every screen maps to a real route.
- Real rows verified in: COA trains/movements/schedules/line-occupancy/
available-windows(+generate), TMS defects/inspections/maintenance, TDMS,
SMMS alerts/inspections/maintenance, planning tasks/constraints/resources/
task-resources/dependencies/priority(+recalculate/validate), candidates
windows(+check/generate), unified defects/maintenance/block-requirements/
normalize-*, optimization inputs/outputs/plans(+create persists)/plan-tasks/
runs(+create)/validate/priority/recalculate/decisions.

## 1. Mutation surface (what really persists today)
- POST /api/optimization/plans -> PERSISTS (probe created id=6; GET-back OK).
=> Controller "create a block plan" form wires HERE for real (not a stub).
- POST /api/unified/block-requirements -> 422 on wrong body => validates
honestly; required fields: maintenance_requirement_id, block_type, status.
NOTE: block_type discriminator means this is the maintenance->block-requirement
transform, NOT an Engineering/S&T->Controller handoff.
- No Controller-Approval / block-request HANDOFF mutation exists.
=> Engineering/S&T/Traction "request block handoff to Controller" stays a
clearly-labelled placeholder per user decision (S11), never a fake submit.

## 2. Deliverables (all ASCII-only files; rendering-insensitive verification)
A. Services layer (frontend/src/services/api):
 client.ts (done: ListParams canonical, apiGet/apiPost/isAxiosError/error),
 types.ts (done: typed models), health/coa/planning (done) + NEW
 tdms.ts tms.ts smms.ts unified.ts candidates.ts optimization.ts
 (typed, toList-normalized, never mocked).
B. Screens wired to real endpoints (no mock, no invented numbers):
 - Dashboard: real API-derived metrics; on failure -> "unavailable",
   never fabricated; count only what endpoints truly return.
 - COA: trains/movements/schedules/line-occupancy/events/available-windows.
 - TMS/TDMS/SMMS: defects/failures/inspections/maintenance/alerts.
 - Planning: tasks/constraints/resources/task-resources/dependencies/priority
   + Task -> Constraints -> Resources -> Dependencies relationship chain.
 - Candidate windows, available windows, block requirements, optimization
   plans + plan tasks + validation + decisions.
 - Department workspaces (Engineering/S&T/Traction): real endpoints + honest
   block-request placeholder per S11.
C. States: offline/empty/error everywhere; refresh/polling + recovery; no
 crash, no invented data; backend-offline shows graceful states.
D. Routing: SPA fallback + direct-URL verification for all routes.
E. Quality: clean tsc -b, build, lint.
F. Playwright E2E per S17 (real data, offline, recovery, console-clean).
G. Final report with test results + honest limitations.

## 3. Stop condition
Report completion; do NOT start Phase 3.