"""
Router: HR analytics — serves the HR DASHBOARD SCREEN (src/pages/HRDashboard.jsx).

FUNCTIONALITY / ENDPOINT MAP:
    GET /api/analytics  -> every number displayed on the dashboard, agent-only
        just like the frontend's RequireAuth role="agent" wrapper:

        FIG. 01  counts-by-status stat cards      <- response.by_status
        FIG. 02  open-tickets-by-category bars    <- response.active_by_category
        FIG. 03  response performance cards       <- response:
                    "AVG FIRST RESPONSE"  mean hours across tickets that got
                                          their first agent reply (the page
                                          formats it with formatHrs())
                    "NO REPLY YET"        active tickets with no agent turn
                    "FIRST REPLIES MADE"  replied/total ratio string in the
                                          UI, computed from the two numbers

        The header subtitle "N tickets tracked · M still being worked on."
        comes from `total` and `active`.

    The figures re-render when any mutation happens to open tickets; the
    frontend can simply re-fetch this endpoint after its store calls
    (POST replies / PATCH status...) — no push channel required for the demo.
"""

from fastapi import APIRouter

from app.dependencies import AgentUser, DbSession
from app.schemas.analytics_schemas import AnalyticsOut
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics / HR Dashboard screen"])


@router.get("", response_model=AnalyticsOut)
def dashboard(db: DbSession, _agent: AgentUser):
    """Aggregated ticket statistics for the HR dashboard figures."""
    return analytics_service.dashboard_stats(db)
