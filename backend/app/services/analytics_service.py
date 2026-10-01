"""
HR Dashboard analytics service.

FUNCTIONALITY:
    Direct port of the `stats` useMemo computation inside pages/
    HRDashboard.jsx, executed against MySQL instead of the in-browser
    mock array. One API call (GET /api/analytics) hands the dashboard all
    three figure sections at once:

      by_status          - row count per status across ALL tickets
                           (FIG. 01 stat cards; always includes zero-count
                           statuses so cards never disappear)
      active_by_category - counts per category for tickets that are still
                           live (anything not Resolved/Closed) = FIG. 02
                           "open tickets by category" bars
      response           - FIG. 03:
                             avg_first_response_hours: mean across tickets
                               having a first agent reply (Date.parse math in
                               the frontend; hours-as-float here since the
                               UI formats via formatHrs in src/utils.js)
                             no_reply_yet: active tickets that no agent has
                               replied to (the error-toned "NO REPLY YET" card)
                             replied / total: the "FIRST REPLIES MADE" card

    Done in Python over a tight SELECT (only the 4 needed columns); the
    ticket volume of an HR desk makes SQL decomposition unnecessary here
    while keeping the code readable for learning purposes.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import CATEGORIES, STATUSES
from app.models import Ticket
from app.schemas.analytics_schemas import AnalyticsOut, ResponseStats


def dashboard_stats(db: Session) -> AnalyticsOut:
    rows = db.execute(
        select(
            Ticket.status,
            Ticket.category,
            Ticket.first_reply_at,
            Ticket.created_at,
        )
    ).all()

    total = len(rows)
    by_status = {s: 0 for s in STATUSES}          # zero-fill like the useMemo
    active_by_category = {c: 0 for c in CATEGORIES}
    resolved_or_closed = {"Resolved", "Closed"}

    response_times_hrs: list[float] = []
    active = 0
    replied = 0

    for status, category, first_reply_at, created_at in rows:
        if status in by_status:
            by_status[status] += 1
        if status not in resolved_or_closed:
            active += 1
            if category in active_by_category:
                active_by_category[category] += 1
        if first_reply_at is not None:
            replied += 1
            response_times_hrs.append(
                (first_reply_at - created_at).total_seconds() / 3600.0
            )

    return AnalyticsOut(
        total=total,
        active=active,
        by_status=by_status,
        active_by_category=active_by_category,
        response=ResponseStats(
            avg_first_response_hours=(
                sum(response_times_hrs) / len(response_times_hrs)
                if response_times_hrs
                else None
            ),
            no_reply_yet=sum(
                1 for r in rows if r[0] not in resolved_or_closed and r[2] is None
            ),
            replied=replied,
            total=total,
        ),
    )
