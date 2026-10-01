"""
FastAPI application entry point — assembles the backend for the HR
ticketing system.

FUNCTIONALITY:
    - On startup, prepares the database (auto-created SQLite file by
      default; or the configured MySQL database), creates the SQLAlchemy
      tables (Base.metadata.create_all) and seeds the demo users/tickets
      (app/seed.py) if they are still empty — so `uvicorn` bootstraps
      cleanly on a fresh machine.
    - Enables CORS for the Vite dev-server origin so the React screens can
      call this API from http://localhost:5173.
    - Mounts the per-screen routers (see packages app/routers/*.py):
        /api/auth        <- Login screen
        /api/meta        <- dropdown/reference data used on many screens
        /api/my-tickets  <- Employee dashboard screen
        /api/tickets...  <- New ticket + Ticket detail screens
        /api/inbox       <- HR inbox screen
        /api/analytics   <- HR dashboard screen
    - Exposes a GET / (health + endpoint index) and the automatic OpenAPI
      docs at /docs, which doubles as a clickable manual for all endpoints.

RUN (from the backend/ folder, WSL/Linux):
    python3 -m venv .venv
    source .venv/bin/activate            (Windows: .venv\\Scripts\\activate)
    pip install -r requirements.txt
    python -m uvicorn app.main:app --reload --port 8000
Then open http://localhost:8000/docs to exercise the API. The SQLite
database (backend/hr_ticketing.db) is created and demo-seeded on first boot.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.routers import (
    analytics_router,
    auth_router,
    inbox_router,
    meta_router,
    ticket_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables + seed demo data once per server boot."""
    # importing models registers every one of them with Base.metadata
    import app.models as _models  # noqa: F401
    from app.core.database import ensure_database_exists
    from app.seed import seed_demo_data

    _print_db_identity()
    ensure_database_exists()          # auto-run CREATE DATABASE IF NOT EXISTS
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)
    yield


def _print_db_identity() -> None:
    """Print which database the backend will use (passwords are never shown).
    Catches 'the .env file isn't being read' instantly, because the log
    exposes the file/server it actually picked up."""
    if settings.database_url.startswith("sqlite"):
        print(f"[startup] database  ->  SQLite file: {settings.database_url}")
        return

    from sqlalchemy.engine import make_url

    url = make_url(settings.database_url)
    print(
        f"[startup] database  ->  {url.host}:{url.port or 3306}/{url.database}  "
        f"as user '{url.username}' (from DATABASE_URL / backend/.env)"
    )


settings = get_settings()

app = FastAPI(
    title="HR Ticketing System API",
    description=(
        "Backend for the React HR desk. One endpoint group per screen:\n"
        "* Login -> /api/auth\n"
        "* My tickets / New ticket / Ticket detail -> /api/tickets, /api/my-tickets\n"
        "* HR inbox -> /api/inbox\n"
        "* HR dashboard -> /api/analytics\n"
        "* Shared dropdown data -> /api/meta"
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# The React dev server (vite.config.js -> port 5173) must be allowed to call
# us cross-origin; keep the list tight in production, not ["*"].
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router.router)
app.include_router(meta_router.router)
app.include_router(ticket_router.router)
app.include_router(inbox_router.router)
app.include_router(analytics_router.router)


@app.get("/", tags=["health"])
def root():
    """Service card: quick health check + endpoint index for humans."""
    return {
        "service": "HR Ticketing System API",
        "docs_url": "/docs",
        "screens_served": {
            "Login.jsx": "/api/auth/*",
            "EmployeeDashboard.jsx": "/api/my-tickets",
            "NewTicket.jsx": "POST /api/tickets",
            "TicketDetail.jsx": "/api/tickets/{id} (+ replies, status, assignee, priority, category)",
            "HRInbox.jsx": "/api/inbox",
            "HRDashboard.jsx": "/api/analytics",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", port=settings.BACKEND_PORT, reload=True)
