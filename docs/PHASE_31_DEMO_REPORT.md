# SIH 26027 — Demo-Completion Report (Phase 31)

Status: **DEMO-READY**. One real, validated, controller-gated block-planning chain is
end-to-end verified against the running backend (FastAPI :8011, Postgres `sih_26027`)
and the built frontend. No schema change, no destructive migration, no fabricated
approvals, validations, candidates or execution outcomes.

---

## 1. The demo scenario (all real records)

Connected pipeline, every hop a persisted row:

```
master data / source systems
  → (unified) maintenance ask      maintenance_requirement
  → block requirement #1379        block_requirement   station SYN-ST001 · line SYN-L002 · NORMAL · 30m
  → planning task       PT-001462  planning_task #1419  BALLAST_DESILTING · asset #293 · 07:00–07:30
  → available window    #2396      available_window     SYN-ST001 · SYN-L002 · 07:00–07:30 · AVAILABLE
  → candidate           #852037    candidate_block_window FEASIBLE (the single feasible hop in 8,568)
  → optimization run    #13  RAILFLOW-DEMO-RUN-001  PLANNING · COMPLETED · STEP10-DETERMINISTIC-1.0
  → optimization inputs #26/#27 (TASK, CANDIDATE_WINDOW) — outputs #11 (WINDOW_ASSIGNMENT, PROPOSED, selected)
  → block plan          #7   RAILFLOW-DEMO-PLAN-001  PROPOSED · horizon 2026-09-25 00:00–23:59
  → plan task           #9   07:00 → 07:30 · 30m · PROPOSED · remarks "RAILFLOW_DEMO deterministic placement."
  → validation          #33–#36  ALL PASSED (4 checks, 0 failed, 0 warnings)
  → controller decision (empty by design — the operator approves in the Controller page)
```

Validation records for plan #7 (plan_validation): `PLAN_COMPLETENESS PASSED
PLAN_TASKS_PRESENT:1`, `DURATION PASSED PLANNED_DURATION_VALID`, `WINDOW_FIT PASSED
PLANNED_TASK_FITS_CANDIDATE_WINDOW`, `RESOURCE PASSED RESOURCE_RELATIONSHIP_PRESENT:1419`.

Frontend verification of this exact chain: open **Block Plans → select
RAILFLOW-DEMO-PLAN-001** (drawer shows task, candidate #852037, window #2396,
validation PASS, CLEAR train impact), then **Open in Controller → Approve** records a
real `POST /api/optimization/decisions`.

## 2. Why candidates are mostly INFEASIBLE (honest explanation)

8,568 candidate rows were generated on day 1 (42 tasks × 204 windows) and only 1 is
`FEASIBLE` (5 `REQUIRES_REVIEW`, 8,562 `INFEASIBLE`). This is a result of the
deterministic feasibility engine, not a bug: most tasks have tight 30-minute
`earliest_start → latest_end` slots while most available windows sit on other days /
stations / lines, so the per-window station, line and duration-fit checks reject them.
The single FEASIBLE match (task 1419 → window 2396) is exactly what the demo plan
uses; the Candidate Windows page already surfaces this count honestly.

## 3. What was implemented

### Backend
- `backend/scripts/demo_scenario.py` — idempotent demo seed. Removes the stale probe
  plan, creates run #13 + inputs/outputs + plan #7 + plan task #9, clears and
  re-runs real validation. Safe to re-run (second run verified idempotent).
- `backend/app/services/plan_validation.py` — now emits an explicit
  `PLAN_COMPLETENESS PASSED (PLAN_TASKS_PRESENT:n)` record when a plan has tasks
  (previously only a FAILED record when empty). Backwards compatible: 257 tests pass.

### Frontend
- `src/utils/plan-chain.ts` (new) — client-side joins of `block_plan → plan tasks →
  candidate → available window → task → asset → validation → decision` plus derived
  section/line/block-window/duration and **train impact** from real COA
  occupancy/schedules. Reused across Block Plans, Train Impact, Execution, Audit.
- **Block Plans page** (fully live) — plan roster with derived section/line/station,
  block window, duration, task count, validation counts, latest controller decision,
  train-impact badge; detail drawer; deep link `/controller?plan=<id>`.
- **Controller page** — reads `?plan=<id>`, auto-opens that plan; plan code cell opens
  the detail drawer; drawer gained task count, validation badge, decision status.
- **Live Map page** — rewritten as a dark control-room SVG schematic per line: double
  rails on a km grid, station consoles, live train glyphs (latest COA movement per
  train id), asset / maintenance / block / task / occupancy markers, the validated
  plan-block pill, a 00:00→24:00 daily window timeline (available windows, candidates,
  occupancy, planned block), zoom in/out/fit, legend, and a deep selection drawer
  (station / train / planned block detail with real records).
- **Dashboard** — Block Plans metric now real; added "Plans validated", "Controller
  decisions", "Awaiting decision"; added Block Plans quick target.
- **Train Impact page** — per planned block and per feasible/review candidate,
  affected trains computed from COA schedules + line-occupancy overlap; CLEAR /
  CONFLICT the truthful way.
- **Execution page** — approved plans (from real decisions) with planned windows and
  task disposition; execution-outcomes table that is honestly empty until outcomes
  exist; no invented actual start/end or delays.
- **Audit page** — hop-by-hop provenance trail per plan: source ask → block
  requirement → task → priority → candidate → placement → validation → decision →
  execution, each with its persisted timestamp; optimisation-run listing.
- **Maintenance page** — division workfront in operational language (asset, derived
  department, blocks required, planning-progress, status).
- **Block Requests page** — station/line, Traffic/Power/Integrated block language,
  duration, earliest–latest window, source ask, planning tasks, hard/soft constraints.

## 4. Phases explicitly not implemented / not possible

- No **real-time train tracking**: movements are recorded COA events; trains without a
  mappable movement are not drawn (no fabricated positions).
- No **real GPS / IoT telemetry**: map is a km schematic — "control-room" style, not
  to geographic scale.
- No **execution status auto-advance**: plan status is only advanced by the backend
  API (`block_plan.status` stays `PROPOSED` on approval — controller decision is the
  acceptance record, by design; approval via frontend `POST
  /api/optimization/decisions`).
- **Modify & Lock** plan editing remains disabled ("Not yet connected") because the
  API does not expose in-place window editing.
- No **AI/optimizer training loop**: execution feedback would drive it; no outcomes
  exist yet.
- No **auto-approval, auto-validation faking, synthetic UI data**: every displayed
  count/status reads from the backend; failures surface real error messages.

## 5. Verification results

| Check | Command | Result |
|---|---|---|
| Frontend typecheck | `tsc -b --force` (frontend) | PASS (0 errors) |
| Frontend lint | `oxlint src` (frontend) | PASS (pre-existing warnings only) |
| Frontend build | `vite build` (frontend) | PASS (2089 modules) |
| Backend health | `GET /health` | 200 healthy |
| Database health | `GET /health/db` | 200 connected |
| API routes (23 GETs) | plans, plan-tasks, validations, decisions, runs, inputs, outputs, execution-outcomes, planning tasks/priority, candidates, coa trains/movements/schedules/line-occupancy/available-windows, locations, assets, unified maintenance/block-requirements/defects | all 200 |
| Backend tests | `pytest backend/tests` | 257 passed |
| Demo plan validation | plan #7 → validation #33–#36 | 4 PASSED / 0 FAILED |
| Demo chain check | `POST /api/candidates/check` {1419, 2396} | feasible, candidate #852037 |

Routes: `/`, `/controller?plan=7`, `/live-map`, `/block-plans`, `/train-impact`,
`/execution`, `/audit`, `/maintenance`, `/block-requests`, `/planning`,
`/candidate-windows`, `/departments/*`, `/coa`, `/tms`, `/tdms`, `/smms`, `/unified`.

## 6. How to run

```powershell
# backend (venv)
$env:PYTHONPATH="D:\projects\SIH_26027_database\backend"
& D:\projects\SIH_26027_database\backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8011

# (re)seed the demo scenario when needed
& D:\projects\SIH_26027_database\backend\venv\Scripts\python.exe backend/scripts/demo_scenario.py

# frontend
& D:\projects\SIH_26027_database\frontend\node_modules\.bin\vite.cmd dev
```

Demo walkthrough: Dashboard (pipeline metrics) → Block Plans (plan #7 details +
validation PASS) → Controller (approve → real decision record) → Train Impact →
Execution (approved plan, "no outcomes yet" is truthful) → Audit (full trail) → Live
Map (rail schematic with the planned block at SYN-ST001 on SYN-L002 at 07:00–07:30).