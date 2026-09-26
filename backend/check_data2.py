from app.core.database import SessionLocal
from app.models import CandidateBlockWindow, AvailableWindow, PlanningTask, LineOccupancy, BlockRequirement, MaintenanceRequirement, BlockPlan, BlockPlanTask
from sqlalchemy import func, and_

db = SessionLocal()

print('=== CandidateBlockWindow by line AND feasibility ===')
for row in db.query(AvailableWindow.line_number, CandidateBlockWindow.feasibility_status, func.count(CandidateBlockWindow.id)).join(CandidateBlockWindow, CandidateBlockWindow.available_window_id == AvailableWindow.id).group_by(AvailableWindow.line_number, CandidateBlockWindow.feasibility_status).all():
    print(f'  {row[0]} | {row[1]}: {row[2]}')

print('\n=== CandidateBlockWindow by line AND feasible ===')
for row in db.query(AvailableWindow.line_number, CandidateBlockWindow.feasible, func.count(CandidateBlockWindow.id)).join(CandidateBlockWindow, CandidateBlockWindow.available_window_id == AvailableWindow.id).group_by(AvailableWindow.line_number, CandidateBlockWindow.feasible).all():
    print(f'  {row[0]} | feasible={row[1]}: {row[2]}')

print('\n=== BlockRequirement by line ===')
for row in db.query(BlockRequirement.line_number, func.count(BlockRequirement.id)).group_by(BlockRequirement.line_number).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== BlockPlanTask by line (via candidate -> available_window) ===')
for row in db.query(AvailableWindow.line_number, func.count(BlockPlanTask.id)).join(CandidateBlockWindow, BlockPlanTask.candidate_block_window_id == CandidateBlockWindow.id).join(AvailableWindow, CandidateBlockWindow.available_window_id == AvailableWindow.id).group_by(AvailableWindow.line_number).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== BlockPlanTask by plan ===')
for row in db.query(BlockPlan.plan_code, func.count(BlockPlanTask.id)).join(BlockPlanTask, BlockPlanTask.block_plan_id == BlockPlan.id).group_by(BlockPlan.plan_code).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== Sample CandidateBlockWindow for UP-MAIN (first 5) ===')
cands = db.query(CandidateBlockWindow).join(AvailableWindow).filter(AvailableWindow.line_number == 'UP-MAIN').limit(5).all()
for c in cands:
    print(f'  id={c.id}, task={c.planning_task_id}, window={c.available_window_id}, feasible={c.feasible}, status={c.feasibility_status}, duration={c.candidate_duration_minutes}')

print('\n=== AvailableWindow for UP-MAIN (first 5) ===')
wins = db.query(AvailableWindow).filter(AvailableWindow.line_number == 'UP-MAIN').limit(5).all()
for w in wins:
    print(f'  id={w.id}, station={w.station_code}, {w.window_start} - {w.window_end}, duration={w.duration_minutes}, status={w.window_status}')

print('\n=== PlanningTask count per station ===')
for row in db.query(PlanningTask.location_code, func.count(PlanningTask.id)).group_by(PlanningTask.location_code).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== CandidateBlockWindow distinct planning_task_ids for UP-MAIN ===')
task_ids = db.query(CandidateBlockWindow.planning_task_id).join(AvailableWindow).filter(AvailableWindow.line_number == 'UP-MAIN').distinct().all()
print(f'  Distinct planning_task_ids: {len(task_ids)}')
print(f'  IDs: {[t[0] for t in task_ids]}')

print('\n=== CandidateBlockWindow distinct available_window_ids for UP-MAIN ===')
win_ids = db.query(CandidateBlockWindow.available_window_id).join(AvailableWindow).filter(AvailableWindow.line_number == 'UP-MAIN').distinct().all()
print(f'  Distinct available_window_ids: {len(win_ids)}')

db.close()