"""
Database wiring — SQLite by default, MySQL optional.

FUNCTIONALITY:
    - Creates the SQLAlchemy engine for the configured DATABASE_URL.
      Default is a local SQLite file: zero setup, no server, no credentials.
      MySQL still works — set DATABASE_URL to a mysql+pymysql:// URL (install
      PyMySQL first, see requirements.txt) and the same code runs unchanged.
    - SQLite specifics handled here so endpoints never trip over them:
        check_same_thread=False — FastAPI serves each request on a worker
            thread; the default check would panic. Safe here because every
            request gets its own connection from the pool.
        PRAGMA foreign_keys=ON — SQLite disables referential integrity by
            default; this turns it on so the FK rules match MySQL.
    - MySQL specifics (only active on a mysql:// URL):
        pool_pre_ping / pool_recycle — survive MySQL's server-side idle
            timeouts without surfacing as random 500s.
    - ensure_database_exists(): for MySQL it connects without the database
      name and runs CREATE DATABASE IF NOT EXISTS, so a fresh MySQL box
      boots cleanly. For SQLite the file itself IS the database — creating
      the engine is enough, so this is a no-op.
    - Provides Base, the declarative superclass for every ORM model in
      app/models/. Tables are created via create_all on startup (app/main.py).
    - Provides get_db(), a FastAPI dependency handing each request a session
      and guaranteeing it is closed afterwards: declare
      `db: Session = Depends(get_db)` in any router.

    Deliberately synchronous (classic) SQLAlchemy instead of async: shorter,
    easier to follow, and FastAPI runs `def` endpoints in a thread pool.
"""

import os

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

_IS_SQLITE = settings.database_url.startswith("sqlite")

if _IS_SQLITE:
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
        future=True,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _record):  # pragma: no cover - glue
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_recycle=280,
        future=True,
    )

# request-scoped session factory; get_db opens/closes one session per request
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Inherit from this in app/models/*.py to make a table."""

    pass


def ensure_database_exists() -> None:
    """
    Run once at startup BEFORE create_all. For MySQL: reach the server using
    the URL without its database part and execute a guarded CREATE DATABASE.
    For SQLite there is nothing to do — the engine already points at the
    file (created lazily on first use), so this returns immediately.
    """
    if _IS_SQLITE:
        # make sure the parent directory exists, then let connect() create the file
        url = make_url(settings.database_url)
        file_path = url.database
        if file_path:
            parent = os.path.dirname(file_path)
            if parent and not os.path.isdir(parent):
                os.makedirs(parent, exist_ok=True)
        return

    url = make_url(settings.database_url)
    db_name = url.database
    if not db_name:  # e.g. no database in URL — nothing to guarantee
        return

    server_url = url.set(database=None)
    server_engine = create_engine(server_url, pool_pre_ping=True, future=True)
    try:
        with server_engine.connect() as conn:
            conn.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            conn.commit()
    finally:
        server_engine.dispose()


def get_db():
    """FastAPI dependency: yield a database session for one request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
