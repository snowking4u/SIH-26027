#!/usr/bin/env python3
"""
Generate block plans from feasible candidate windows.
Creates BlockPlan + BlockPlanTask + runs validation for controller review.
"""
import sys
import argparse
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.block_plan import BlockPlan
from app.models.block_plan_task import BlockPlanTask
from app.models.candidate_block_window import CandidateBlockWindow
from app.models.optimization_run import OptimizationRun
from app.models.planning_task import PlanningTask
from app.models.available_window import AvailableWindow
from app.services.plan_validation import store_plan_validations


def generate_block_plans(limit: int | str = 15, clean: bool = False):
    db = SessionLocal()
    try:
        run = db.query(OptimizationRun).first()
        if not run:
            print("No optimization run found. Run synthetic data generation first.")
            return

        if clean:
            # Delete existing auto-generated plans
            deleted = db.query(BlockPlan).filter(
                BlockPlan.plan_code.like("PLAN-AUTO-%") | BlockPlan.plan_code.like("PLAN-TEST-%")
            ).delete(synchronize_session=False)
            db.commit()
            print(f"Cleaned {deleted} existing auto-generated plans")

        # Get feasible candidates
        feasible = db.query(CandidateBlockWindow).filter_by(feasible=True).all()
        print(f"Found {len(feasible)} feasible candidate windows")

        if limit == "all":
            to_process = feasible
        else:
            to_process = feasible[:int(limit)]

        created = 0
        for idx, f in enumerate(to_process, start=1):
            # Get planning task for metadata
            pt = db.query(PlanningTask).get(f.planning_task_id)
            aw = db.query(AvailableWindow).get(f.available_window_id)

            station = aw.station_code if aw else "UNKNOWN"
            line = aw.line_number if aw else "UNKNOWN"

            code = f"PLAN-AUTO-{idx:03d}"
            if db.query(BlockPlan).filter_by(plan_code=code).first():
                continue

            plan = BlockPlan(
                optimization_run_id=run.id,
                plan_code=code,
                plan_date=f.candidate_start.date(),
                status="PROPOSED",
                planning_horizon_start=f.candidate_start,
                planning_horizon_end=f.candidate_end,
                description=f"Maintenance for {pt.task_code} at {station} ({line}). Duration: {f.candidate_duration_minutes}m."
            )
            db.add(plan)
            db.flush()

            db.add(BlockPlanTask(
                block_plan_id=plan.id,
                planning_task_id=f.planning_task_id,
                candidate_block_window_id=f.id,
                planned_start=f.candidate_start,
                planned_end=f.candidate_end,
                planned_duration_minutes=f.candidate_duration_minutes,
                sequence_number=1,
                status="PROPOSED",
                remarks=f"Placed in window #{aw.id} ({station} {line})." if aw else "Auto-generated"
            ))
            db.commit()

            store_plan_validations(db, plan.id)
            created += 1
            print(f"  Created {code} for task {pt.task_code} at {station} ({line})")

        print(f"\nDone! Created {created} block plans with validations.")
        print(f"Controller dashboard now has {created} recommendations awaiting review.")

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate block plans from feasible candidates")
    parser.add_argument("--limit", default="15", help="Number of plans to create (or 'all')")
    parser.add_argument("--clean", action="store_true", help="Remove existing auto-generated plans first")
    args = parser.parse_args()
    generate_block_plans(args.limit, args.clean)