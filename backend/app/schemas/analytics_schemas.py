"""
Schemas: HR dashboard analytics.

FUNCTIONALITY:
    Response contract for GET /api/analytics — the numbers behind
    HRDashboard.jsx's three FIG sections:

      byStatus          -> FIG. 01 "Counts by status" stat cards
      activeByCategory  -> FIG. 02 "Open tickets by category" horizontal bars
      response          -> FIG. 03 "Response performance" cards:
                           avg first response hours, count of active tickets
                           still unanswered, and replied/total ratio

    Field names mirror the `stats` object computed in HRDashboard.jsx's
    useMemo, so a fetch()-based implementation can feed FIG components
    without reshaping. avg_first_response_hours is hours-as-float (the
    frontend formats it with formatHrs()).
"""

from app.schemas.base import CamelModel


class ResponseStats(CamelModel):
    avg_first_response_hours: float | None  # None while no agent replied yet
    no_reply_yet: int
    replied: int
    total: int


class AnalyticsOut(CamelModel):
    total: int
    active: int
    by_status: dict[str, int]
    active_by_category: dict[str, int]
    response: ResponseStats
