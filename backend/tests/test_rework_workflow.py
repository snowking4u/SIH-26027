"""Controller reject -> planning rework workflow tests.

Covers the required lifecycle:

    PROPOSED -> REJECTED -> REWORK_REQUIRED -> REVISED PLAN -> CONTROLLER REVIEW

Verifies that the original rejected plan and its validation history are
preserved, rejection requires a reason persisted in controller_decision, the
revised recommendation is traceable (revises_plan_id) and returns to the
controller queue, and domain guards reject invalid rework states.
"""

from datetime import datetime

from sqlalchemy import inspect, select

from app.models.block_plan import BlockPlan
from app.models.controller_decision import ControllerDecision


def create_source(client, code):
    response = client.post(
        "/api/source-systems",
        json={
            "system_code": code,
            "system_name": code,
            "description": f"TEST/SYNTHETIC {code} source system for rework.",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_asset(client, source, suffix):
    response = client.post(
        "/api/assets",
        json={
            "source_system_id": source["id"],
            "source_asset_id": f"{suffix}-REWORK-ASSET",
            "asset_type": "TEST/SYNTHETIC",
            "asset_name": f"TEST/SYNTHETIC {suffix} Rework Asset",
            "status": "TEST",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def add_tms_chain(client, asset, code, start, end):
    inspection = client.post(
        "/api/tms/inspections",
        json={
            "asset_id": asset["id"],
            "inspection_date": start,
            "inspection_type": "USFD",
            "parameter_code": "TUBE-DEFLECTION",
            "parameter_value": "4.5",
            "remarks": "TEST/SYNTHETIC TMS inspection.",
        },
    )
    assert inspection.status_code == 201, inspection.text
    inspection = inspection.json()
    defect = client.post(
        "/api/tms/defects",
        json={
            "asset_id": asset["id"],
            "inspection_id": inspection["id"],
            "defect_code": code,
            "defect_description": "TEST/SYNTHETIC TMS defect observed.",
            "severity": "HIGH",
            "detected_date": start,
            "status": "OPEN",
        },
    )
    assert defect.status_code == 201, defect.text
    maintenance = client.post(
        "/api/tms/maintenance",
        json={
            "asset_id": asset["id"],
            "defect_id": defect.json()["id"],
            "maintenance_type": "REPLACEMENT",
            "planned_date": start,
            "start_date": start,
            "end_date": end,
            "status": "PLANNED",
        },
    )
    assert maintenance.status_code == 201, maintenance.text
    return inspection, defect.json(), maintenance.json()


def make_window(db_session, start="2026-05-11T10:00:00", end="2026-05-11T14:00:00"):
    from app.models.available_window import AvailableWindow

    start_dt = datetime.fromisoformat(start)
    end_dt = datetime.fromisoformat(end)
    window = AvailableWindow(
        station_code="STA-7",
        line_number="L7",
        window_start=start_dt,
        window_end=end_dt,
        duration_minutes=int((end_dt - start_dt).total_seconds() // 60),
        window_status="AVAILABLE",
        calculation_source="TEST/SYNTHETIC:COA_SOURCE_DERIVATION_GAP",
        generated_at=datetime.utcnow(),
    )
    db_session.add(window)
    db_session.commit()
    return window


def setup_chain(client, db_session, *, label="STEP10", new_source=True):
    """Synthetic planning foundation with a FEASIBLE candidate.

    ``new_source`` reuses the single shared TMS source system so multiple
    independent maintenance chains can exist inside one test database.
    """
    if new_source:
        source = create_source(client, "TMS")
    else:
        sources = client.get("/api/source-systems?system_code=TMS").json()
        assert sources, sources
        source = sources[0]
    asset = create_asset(client, source, label)
    _, _, maintenance = add_tms_chain(
        client,
        asset,
        f"{label}-DF-001",
        "2026-05-11T09:00:00",
        "2026-05-11T11:00:00",
    )
    client.post("/api/unified/normalize/tms")
    requirements = client.get("/api/unified/maintenance").json()
    mr = [
        m
        for m in requirements
        if m["source_record_type"] == "TMS_MAINTENANCE"
        and m["source_record_id"] == maintenance["id"]
    ][0]
    client.post(
        "/api/unified/block-requirements",
        json={
            "maintenance_requirement_id": mr["id"],
            "station_code": "STA-7",
            "line_number": "L7",
            "block_type": "INTEGRATED_BLOCK",
            "required_duration_minutes": 120,
            "power_block_required": False,
            "traffic_block_required": False,
            "status": "REQUIRED",
        },
    )
    client.post("/api/planning/generate-tasks")
    tasks = client.get(
        f"/api/planning/tasks?maintenance_requirement_id={mr['id']}"
    ).json()
    task = tasks[0]
    window = make_window(db_session) if new_source else None
    client.post("/api/candidates/generate")
    candidates = client.get(
        f"/api/candidates/windows?planning_task_id={task['id']}"
    ).json()
    assert len(candidates) == 1, candidates
    return {
        "mr": mr,
        "task": task,
        "window": window,
        "candidate": candidates[0],
    }


def make_plan(client, code="REWORK-PLAN-1", **overrides):
    payload = {
        "plan_code": code,
        "plan_date": "2026-05-11",
        "status": "PROPOSED",
        "planning_horizon_start": "2026-05-11T09:00:00",
        "planning_horizon_end": "2026-05-11T18:00:00",
    }
    payload.update(overrides)
    return client.post("/api/optimization/plans", json=payload)


def add_plan_task(client, plan_id, task_id, candidate_id, start, end, duration):
    return client.post(
        "/api/optimization/plan-tasks",
        json={
            "block_plan_id": plan_id,
            "planning_task_id": task_id,
            "candidate_block_window_id": candidate_id,
            "planned_start": start,
            "planned_end": end,
            "planned_duration_minutes": duration,
            "status": "CONFIRMED",
        },
    )


def validate_results(client, plan_id):
    response = client.post(f"/api/optimization/plans/{plan_id}/validate")
    assert response.status_code == 200, response.text
    return response.json()


def reject_plan(client, plan_id, remarks="Test: window overlaps scheduled traffic"):
    return client.post(
        "/api/optimization/decisions",
        json={
            "block_plan_id": plan_id,
            "decision": "REJECTED",
            "controller_code": "CTRL-REWORK",
            "remarks": remarks,
        },
    )


def make_rejected_plan(client, db_session):
    """A validated plan that has been rejected and sits in the rework queue."""
    chain = setup_chain(client, db_session)
    plan = make_plan(client).json()
    add_plan_task(
        client,
        plan["id"],
        chain["task"]["id"],
        chain["candidate"]["id"],
        "2026-05-11T10:00:00",
        "2026-05-11T12:00:00",
        120,
    )
    validate_results(client, plan["id"])
    response = reject_plan(client, plan["id"])
    assert response.status_code == 201, response.text
    return {
        "chain": chain,
        "plan": plan,
        "decision": response.json(),
    }


def test_reject_requires_reason(client, db_session):
    plan = make_plan(client).json()
    no_reason = client.post(
        "/api/optimization/decisions",
        json={"block_plan_id": plan["id"], "decision": "REJECTED"},
    )
    assert no_reason.status_code == 422, no_reason.text
    blank_reason = client.post(
        "/api/optimization/decisions",
        json={
            "block_plan_id": plan["id"],
            "decision": "REJECTED",
            "remarks": "   ",
        },
    )
    assert blank_reason.status_code == 422, blank_reason.text
    # approve still needs no reason
    approved = client.post(
        "/api/optimization/decisions",
        json={"block_plan_id": plan["id"], "decision": "APPROVED"},
    )
    assert approved.status_code == 201, approved.text


def test_reject_saves_reason_and_timestamp(client, db_session):
    plan = make_plan(client).json()
    response = reject_plan(client, plan["id"], remarks="Outage window is too tight")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["block_plan_id"] == plan["id"]
    assert body["decision"] == "REJECTED"
    assert body["remarks"] == "Outage window is too tight"
    assert body["decided_at"] is not None
    stored = db_session.scalar(
        select(ControllerDecision).where(
            ControllerDecision.block_plan_id == plan["id"]
        )
    )
    assert stored.decision == "REJECTED"
    assert stored.remarks == "Outage window is too tight"


def test_reject_moves_plan_to_rework_and_preserves_history(client, db_session):
    seeded = make_rejected_plan(client, db_session)
    plan_id = seeded["plan"]["id"]

    plan = client.get(f"/api/optimization/plans/{plan_id}").json()
    assert plan["status"] == "REWORK_REQUIRED"
    assert plan["revises_plan_id"] is None

    # original plan, its tasks and its validations are untouched
    tasks = client.get(f"/api/optimization/plan-tasks?block_plan_id={plan_id}").json()
    assert len(tasks) == 1
    validations = client.get(
        f"/api/optimization/validations?block_plan_id={plan_id}"
    ).json()
    assert len(validations) > 0
    decisions = client.get(
        f"/api/optimization/decisions?block_plan_id={plan_id}"
    ).json()
    assert len(decisions) == 1 and decisions[0]["decision"] == "REJECTED"

    # appears in the rework queue, and NOT in the pending controller queue
    rework = client.get("/api/optimization/plans?status=REWORK_REQUIRED").json()
    assert [p["id"] for p in rework] == [plan_id]
    pending = client.get("/api/optimization/plans?status=PROPOSED").json()
    assert all(p["id"] != plan_id for p in pending)


def test_revise_creates_traceable_revised_plan(client, db_session):
    seeded = make_rejected_plan(client, db_session)
    original_id = seeded["plan"]["id"]

    response = client.post(f"/api/optimization/plans/{original_id}/revise", json={})
    assert response.status_code == 201, response.text
    revised = response.json()

    assert revised["revises_plan_id"] == original_id
    assert revised["status"] == "PROPOSED"
    assert revised["plan_code"].startswith(seeded["plan"]["plan_code"] + "-R")
    assert revised["plan_date"] == seeded["plan"]["plan_date"]
    assert revised["description"].startswith("Revised recommendation")

    # original stays immutable in rework; revised comes back to the controller
    original = client.get(f"/api/optimization/plans/{original_id}").json()
    assert original["status"] == "REWORK_REQUIRED"
    pending = client.get("/api/optimization/plans?status=PROPOSED").json()
    assert revised["id"] in [p["id"] for p in pending]

    # revised clones the task and is deterministically validated
    revised_tasks = client.get(
        f"/api/optimization/plan-tasks?block_plan_id={revised['id']}"
    ).json()
    assert len(revised_tasks) == 1
    assert (
        revised_tasks[0]["planning_task_id"]
        == seeded["chain"]["task"]["id"]
    )
    assert (
        revised_tasks[0]["candidate_block_window_id"]
        == seeded["chain"]["candidate"]["id"]
    )
    revised_validations = client.get(
        f"/api/optimization/validations?block_plan_id={revised['id']}"
    ).json()
    assert len(revised_validations) > 0

    # history is linked: original rejected decision kept; revised has none yet
    original_decisions = client.get(
        f"/api/optimization/decisions?block_plan_id={original_id}"
    ).json()
    assert len(original_decisions) == 1 and original_decisions[0]["decision"] == "REJECTED"
    revised_decisions = client.get(
        f"/api/optimization/decisions?block_plan_id={revised['id']}"
    ).json()
    assert revised_decisions == []


def test_controller_can_decide_on_revised_plan(client, db_session):
    seeded = make_rejected_plan(client, db_session)
    revised_id = client.post(
        f"/api/optimization/plans/{seeded['plan']['id']}/revise", json={}
    ).json()["id"]

    decision = client.post(
        "/api/optimization/decisions",
        json={"block_plan_id": revised_id, "decision": "APPROVED"},
    )
    assert decision.status_code == 201, decision.text

    revised = client.get(f"/api/optimization/plans/{revised_id}").json()
    assert revised["revises_plan_id"] == seeded["plan"]["id"]
    decisions = client.get(
        f"/api/optimization/decisions?block_plan_id={revised_id}"
    ).json()
    assert len(decisions) == 1 and decisions[0]["decision"] == "APPROVED"


def test_revise_requires_rework_status(client, db_session):
    plan = make_plan(client).json()
    response = client.post(f"/api/optimization/plans/{plan['id']}/revise", json={})
    assert response.status_code == 409, response.text


def test_revise_requires_recorded_rejection(client, db_session):
    plan = make_plan(client).json()
    stored = db_session.get(BlockPlan, plan["id"])
    stored.status = "REWORK_REQUIRED"
    db_session.commit()
    response = client.post(f"/api/optimization/plans/{plan['id']}/revise", json={})
    assert response.status_code == 409, response.text
    assert "rejection" in response.json()["detail"].lower()


def test_revise_with_alternate_candidate(client, db_session):
    chain = setup_chain(client, db_session)
    second = make_window(
        db_session, start="2026-05-11T15:00:00", end="2026-05-11T18:00:00"
    )
    client.post("/api/candidates/generate")
    candidates = client.get(
        f"/api/candidates/windows?planning_task_id={chain['task']['id']}&feasible=true"
    ).json()
    assert len(candidates) == 2, candidates
    first = next(c for c in candidates if c["available_window_id"] == chain["window"].id)
    alternate = next(c for c in candidates if c["available_window_id"] == second.id)

    plan = make_plan(client).json()
    add_plan_task(
        client,
        plan["id"],
        chain["task"]["id"],
        first["id"],
        "2026-05-11T10:00:00",
        "2026-05-11T12:00:00",
        120,
    )
    reject_plan(client, plan["id"], remarks="Shift block off peak movement window")

    response = client.post(
        f"/api/optimization/plans/{plan['id']}/revise",
        json={"candidate_block_window_id": alternate["id"]},
    )
    assert response.status_code == 201, response.text
    revised = response.json()
    assert revised["revises_plan_id"] == plan["id"]

    revised_tasks = client.get(
        f"/api/optimization/plan-tasks?block_plan_id={revised['id']}"
    ).json()
    assert len(revised_tasks) == 1
    assert revised_tasks[0]["candidate_block_window_id"] == alternate["id"]
    assert revised_tasks[0]["planned_start"] == alternate["candidate_start"]
    assert revised_tasks[0]["planned_end"] == alternate["candidate_end"]


def test_revise_rejects_alternate_candidate_for_wrong_task(client, db_session):
    plan_chain = setup_chain(client, db_session, label="PLANWIN")
    other_chain = setup_chain(client, db_session, label="OTHERWIN", new_source=False)

    plan = make_plan(client).json()
    add_plan_task(
        client,
        plan["id"],
        plan_chain["task"]["id"],
        plan_chain["candidate"]["id"],
        "2026-05-11T10:00:00",
        "2026-05-11T12:00:00",
        120,
    )
    reject_plan(client, plan["id"], remarks="Reschedule to another window please")

    response = client.post(
        f"/api/optimization/plans/{plan['id']}/revise",
        json={"candidate_block_window_id": other_chain["candidate"]["id"]},
    )
    assert response.status_code == 409, response.text
    assert "different planning task" in response.json()["detail"].lower()


def test_revise_names_revisions_uniquely(client, db_session):
    seeded = make_rejected_plan(client, db_session)
    first = client.post(
        f"/api/optimization/plans/{seeded['plan']['id']}/revise", json={}
    ).json()
    second = client.post(
        f"/api/optimization/plans/{seeded['plan']['id']}/revise", json={}
    ).json()
    assert first["plan_code"] == seeded["plan"]["plan_code"] + "-R1"
    assert second["plan_code"] == seeded["plan"]["plan_code"] + "-R2"
    revisions = client.get("/api/optimization/plans").json()
    revised_codes = [
        p["plan_code"] for p in revisions if p["revises_plan_id"] == seeded["plan"]["id"]
    ]
    assert sorted(revised_codes) == sorted([first["plan_code"], second["plan_code"]])


def test_reject_approved_plan_conflicts(client, db_session):
    plan = make_plan(client, status="APPROVED").json()
    response = reject_plan(client, plan["id"])
    assert response.status_code == 409, response.text


def test_revises_plan_id_fk_restricts(client, db_session):
    columns = {
        col["name"] for col in inspect(db_session.bind).get_columns("block_plan")
    }
    assert "revises_plan_id" in columns, columns
    fks = inspect(db_session.bind).get_foreign_keys("block_plan")
    self_fk = next(
        (fk for fk in fks if "revises_plan_id" in fk["constrained_columns"]),
        None,
    )
    assert self_fk is not None
    assert self_fk["referred_table"] == "block_plan"
    assert self_fk["options"].get("ondelete") == "RESTRICT"


def test_traceable_plan_create_via_api(client, db_session):
    seeded = make_rejected_plan(client, db_session)
    response = make_plan(
        client,
        code="REWORK-LINKED",
        revises_plan_id=seeded["plan"]["id"],
        planning_horizon_start="2026-05-11T09:00:00",
        planning_horizon_end="2026-05-11T18:00:00",
    )
    assert response.status_code == 201, response.text
    assert response.json()["revises_plan_id"] == seeded["plan"]["id"]
    # cannot link a revision to a plan that is not in rework
    pending = make_plan(client, code="REWORK-OTHER").json()
    bad = make_plan(
        client,
        code="REWORK-LINKED-BAD",
        revises_plan_id=pending["id"],
        planning_horizon_start="2026-05-11T09:00:00",
        planning_horizon_end="2026-05-11T18:00:00",
    )
    assert bad.status_code == 409, bad.text
    missing = make_plan(
        client,
        code="REWORK-LINKED-MISSING",
        revises_plan_id=999999,
        planning_horizon_start="2026-05-11T09:00:00",
        planning_horizon_end="2026-05-11T18:00:00",
    )
    assert missing.status_code == 404, missing.text


def test_revised_plan_validation_remains_deterministic(client, db_session):
    seeded = make_rejected_plan(client, db_session)
    revised_id = client.post(
        f"/api/optimization/plans/{seeded['plan']['id']}/revise", json={}
    ).json()["id"]
    validations = client.get(
        f"/api/optimization/validations?block_plan_id={revised_id}"
    ).json()
    assert validations
    passed = [v for v in validations if v["validation_status"] == "PASSED"]
    failed = [v for v in validations if v["validation_status"] == "FAILED"]
    assert passed and not failed, validations