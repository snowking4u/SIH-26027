from app.core.config import settings
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.models.location import LocationMaster

engine = create_engine(settings.database_url)
Session = sessionmaker(bind=engine)
db = Session()

locs = db.scalars(select(LocationMaster)).all()
lines = set()
for l in locs:
    lines.add(l.line_code)
print('Unique line_codes:', lines)
print('Count:', len(lines))

# Also check windows, candidates, occupancy, planned blocks per line
from app.models.coa_available_window import CoaAvailableWindow
from app.models.candidate_block_window import CandidateBlockWindow
from app.models.line_occupancy import LineOccupancy
from app.models.block_plan_task import BlockPlanTask
from app.models.block_plan import BlockPlan

windows = db.scalars(select(CoaAvailableWindow)).all()
candidates = db.scalars(select(CandidateBlockWindow)).all()
occupancy = db.scalars(select(LineOccupancy)).all()
plan_tasks = db.scalars(select(BlockPlanTask)).all()
plans = db.scalars(select(BlockPlan)).all()

print(f'\nWindows: {len(windows)}')
print(f'Candidates: {len(candidates)}')
print(f'Occupancy: {len(occupancy)}')
print(f'Plan tasks: {len(plan_tasks)}')
print(f'Block plans: {len(plans)}')

# Per line
for line in sorted(lines):
    w = [w for w in windows if w.line_number == line]
    c = [c for c in candidates if c.window and c.window.line_number == line]
    o = [o for o in occupancy if o.line_number == line]
    # For planned blocks, need to join through plan_task -> window
    p = []
    for pt in plan_tasks:
        # This is more complex - skip for now
        pass
    print(f'  {line}: windows={len(w)}, candidates={len(c)}, occupancy={len(o)}')

db.close()