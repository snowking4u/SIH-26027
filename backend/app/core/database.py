from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


from datetime import datetime
from sqlalchemy import event, create_engine

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

@event.listens_for(engine, "connect")
def _register_sqlite_functions(dbapi_connection, connection_record):
    if hasattr(dbapi_connection, "create_function"):
        dbapi_connection.create_function(
            "now", 0, lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
