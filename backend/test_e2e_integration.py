import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8011"

def api_request(method, path, data=None):
    url = f"{BASE_URL}{path}"
    req_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=req_data, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, content

def run_e2e():
    print("=== STEP 1: Inspect Assets to find real operational assets ===")
    status, assets = api_request("GET", "/api/assets?limit=5")
    print(f"GET /api/assets status: {status}, count: {len(assets)}")
    assert status == 200 and len(assets) > 0, "Failed to load assets"
    test_asset = assets[0]
    asset_id = test_asset["id"]
    print(f"Selected test asset: ID {asset_id}, Type: {test_asset.get('asset_type')}, Code: {test_asset.get('asset_code')}, Location ID: {test_asset.get('location_id')}")

    print("\n=== STEP 2: Submit Department Maintenance Request from TDM ===")
    req_body = {
        "department_key": "tdms",
        "asset_id": asset_id,
        "maintenance_type": "Track Tamping & Cross-Level Correction",
        "description": "Automated E2E Test: Track geometry deviation observed at Agra Cantt",
        "required_duration_minutes": 120,
        "planned_date": "2026-09-27",
        "earliest_start": "2026-09-27T02:00:00Z",
        "latest_end": "2026-09-27T06:00:00Z",
        "traffic_block_required": True,
        "power_block_required": False,
        "block_type": "TRAFFIC",
        "new_defect_code": "DEF-E2E-001",
        "new_defect_description": "Cross level 12mm dip on rail joint",
        "new_defect_severity": "HIGH"
    }
    status, res = api_request("POST", "/api/unified/maintenance-requests", req_body)
    print(f"POST /api/unified/maintenance-requests status: {status}")
    print(f"Response: {json.dumps(res, indent=2)}")
    assert status == 201, f"Expected 201 Created, got {status}: {res}"

    req_id = res["maintenance_requirement_id"]
    block_req_id = res.get("block_requirement_id")
    planning_task_id = res.get("planning_task_id")
    proposed_plan_id = res.get("block_plan_id")
    defect_id = res.get("defect_id")

    print(f"Workflow entities created:")
    print(f"  - Maintenance Requirement ID: {req_id}")
    print(f"  - Block Requirement ID: {block_req_id}")
    print(f"  - Planning Task ID: {planning_task_id}")
    print(f"  - Proposed Block Plan ID: {proposed_plan_id}")
    print(f"  - Linked Defect ID: {defect_id}")

    assert req_id is not None
    assert block_req_id is not None

    print("\n=== STEP 3: Verify Controller sees proposed plan in Optimization queue ===")
    status, plans = api_request("GET", "/api/optimization/plans?status=PROPOSED")
    print(f"GET /api/optimization/plans?status=PROPOSED status: {status}, count: {len(plans)}")
    assert status == 200
    plan_found = next((p for p in plans if p["id"] == proposed_plan_id), None)
    assert plan_found is not None, f"Proposed plan {proposed_plan_id} not found in Controller queue"
    print(f"Controller queue holds plan {proposed_plan_id}: Corridor={plan_found.get('corridor_code')}, Status={plan_found.get('status')}")

    print("\n=== STEP 4: Controller Decision - REJECTION & REWORK WORKFLOW ===")
    # Controller rejects with remarks
    reject_body = {
        "block_plan_id": proposed_plan_id,
        "decision": "REJECTED",
        "controller_code": "CTRL_AGRA_01",
        "remarks": "Conflicting with Vande Bharat Express slot; shift window by 60 mins."
    }
    status, decision_res = api_request("POST", "/api/optimization/decisions", reject_body)
    print(f"POST /api/optimization/decisions (REJECTED) status: {status}")
    print(f"Decision result: {decision_res}")
    assert status == 201

    # Verify plan status changed to REWORK_REQUIRED
    status, plan_after_reject = api_request("GET", f"/api/optimization/plans/{proposed_plan_id}")
    print(f"Plan status after rejection: {plan_after_reject.get('status')}")
    assert plan_after_reject.get("status") == "REWORK_REQUIRED"

    # Verify department view sees Controller status and remarks
    status, unified_reqs = api_request("GET", "/api/unified/maintenance")
    assert status == 200
    matched_req = next((r for r in unified_reqs if r["id"] == req_id), None)
    assert matched_req is not None
    print(f"Department Unified Maintenance requirement status: {matched_req.get('status')}")

    print("\n=== STEP 5: Planning Rework - Controller / Planner revises plan ===")
    revise_payload = {
        "description": "Revised slot incorporating Section Controller corridor feedback"
    }
    status, revised_plan = api_request("POST", f"/api/optimization/plans/{proposed_plan_id}/revise", revise_payload)
    print(f"POST /api/optimization/plans/{proposed_plan_id}/revise status: {status}")
    print(f"Revised plan ID: {revised_plan.get('id')}, Status: {revised_plan.get('status')}, Revises: {revised_plan.get('revises_plan_id')}")
    assert status == 201
    revised_plan_id = revised_plan.get("id")
    assert revised_plan.get("revises_plan_id") == proposed_plan_id

    print("\n=== STEP 6: Controller Decision - APPROVAL ===")
    approve_body = {
        "block_plan_id": revised_plan_id,
        "decision": "APPROVED",
        "controller_code": "CTRL_AGRA_01",
        "remarks": "Approved after corridor timing adjustment."
    }
    status, app_res = api_request("POST", "/api/optimization/decisions", approve_body)
    print(f"POST /api/optimization/decisions (APPROVED) status: {status}")
    print(f"Approval result: {app_res}")
    assert status == 201

    # Verify decision is recorded and queryable
    status, decisions = api_request("GET", f"/api/optimization/decisions?block_plan_id={revised_plan_id}")
    print(f"GET /api/optimization/decisions for revised plan: status={status}, count={len(decisions)}")
    assert status == 200 and len(decisions) > 0
    latest_decision = decisions[-1]
    print(f"Recorded decision: {latest_decision.get('decision')}, remarks: {latest_decision.get('remarks')}")
    assert latest_decision.get("decision") == "APPROVED"

    print("\n=== STEP 7: Department Updates - Defect and Asset Status Updates ===")
    if defect_id:
        print(f"Updating defect {defect_id} to RECTIFIED...")
        defect_update = {
            "status": "RECTIFIED",
            "rectified_by": "SSE_PWAY_AGC",
            "remarks": "Track geometry corrected via 09-32 CSM tamping machine."
        }
        status, def_res = api_request("PATCH", f"/api/unified/defects/{defect_id}", defect_update)
        print(f"PATCH /api/unified/defects/{defect_id} status: {status}, new status: {def_res.get('status')}")
        assert status == 200 and def_res.get("status") == "RECTIFIED"

    print(f"Updating asset {asset_id} to UNDER_MAINTENANCE and back to IN_SERVICE...")
    status, ass_res1 = api_request("PATCH", f"/api/assets/{asset_id}", {"status": "UNDER_MAINTENANCE"})
    print(f"Asset status after update 1: {status}, status={ass_res1.get('status')}")
    assert status == 200 and ass_res1.get("status") == "UNDER_MAINTENANCE"

    status, ass_res2 = api_request("PATCH", f"/api/assets/{asset_id}", {"status": "IN_SERVICE"})
    print(f"Asset status after update 2: {status}, status={ass_res2.get('status')}")
    assert status == 200 and ass_res2.get("status") == "IN_SERVICE"

    print("\n=======================================================")
    print("ALL END-TO-END INTEGRATION AND WORKFLOW TESTS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    run_e2e()
