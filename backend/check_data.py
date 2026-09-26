from app.core.database import SessionLocal
from app.models import CandidateBlockWindow, AvailableWindow, PlanningTask, LineOccupancy, BlockRequirement
from sqlalchemy import func

db = SessionLocal()

print('=== AvailableWindow by line_number ===')
for row in db.query(AvailableWindow.line_number, func.count(AvailableWindow.id)).group_by(AvailableWindow.line_number).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== CandidateBlockWindow by line (via available_window) ===')
for row in db.query(AvailableWindow.line_number, func.count(CandidateBlockWindow.id)).join(CandidateBlockWindow, CandidateBlockWindow.available_window_id == AvailableWindow.id).group_by(AvailableWindow.line_number).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== CandidateBlockWindow by feasibility_status ===')
for row in db.query(CandidateBlockWindow.feasibility_status, func.count(CandidateBlockWindow.id)).group_by(CandidateBlockWindow.feasibility_status).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== PlanningTask by station_code ===')
for row in db.query(PlanningTask.location_code, func.count(PlanningTask.id)).group_by(PlanningTask.location_code).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== LineOccupancy by line_number ===')
for row in db.query(LineOccupancy.line_number, func.count(LineOccupancy.id)).group_by(LineOccupancy.line_number).all():
    print(f'  {row[0]}: {row[1]}')

print('\n=== AvailableWindow window_status ===')
for row in db.query(AvailableWindow.window_status, func.count(AvailableWindow.id)).group_by(AvailableWindow.window_status).all():
    print(f'  {row[0]}: {row[1]}')

db.close()