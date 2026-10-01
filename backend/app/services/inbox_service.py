"""
HR Inbox query service.

FUNCTIONALITY:
    Implements exactly what the filter panel in components/TicketTable.jsx
    does today (it filters/sorts an already-loaded list in the browser);
    moving it to the database keeps the behaviour on the HR Inbox screen
    while making it work server-side as the table grows:

      q        - free text across subject, description, ticket id and the
                 employee's name (case-insensitive, mirrors the frontend's
                 `.includes` matching)
      status / category / priority / assignee - exact-match dropdown filters
      sort     - updated | created | priority | subject | employee | status
                 (same set as the table's clickable column headers)
      dir      - asc | desc (defaults to updated/desc like store.listTickets;
                 note the frontend table starts on the ascending variant of
                 "updated" — pass dir=asc to reproduce that exact order)

      Sorting keys worth calling out:
        priority -> weight from app.constants.PRIO_ORDER (Urgent=4 ... Low=1),
                    mirroring src/components/sorting.js
        employee -> employee's display name via the users-table join
        status   -> the STATUSES ordering (Open before In Progress, ...)
"""

from fastapi import HTTPException
from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.constants import CATEGORIES, PRIORITIES, PRIO_ORDER, STATUSES
from app.models import Ticket, User

# SQL CASE expressions that turn text columns into sortable numbers —
# same trick the functional sorters in TicketTable.jsx use.
_PRIORITY_WEIGHT = case(*[(Ticket.priority == p, w) for p, w in PRIO_ORDER.items()])
_STATUS_WEIGHT = case(*[(Ticket.status == s, i) for i, s in enumerate(STATUSES)])

SORT_FIELDS = {
    "updated": Ticket.updated_at,
    "created": Ticket.created_at,
    "priority": _PRIORITY_WEIGHT,
    "subject": Ticket.subject,
    "employee": User.name,  # employees' display names through the join below
    "status": _STATUS_WEIGHT,
}


def search_tickets(
    db: Session,
    *,
    q: str | None = None,
    status: str | None = None,
    category: str | None = None,
    priority: str | None = None,
    assignee: str | None = None,
    sort: str = "updated",
    direction: str = "desc",
) -> list[Ticket]:
    """Filtered + sorted ticket list powering GET /api/inbox."""
    # Three FK columns reference users (employee/assignee/closed_by), so the
    # join condition must be explicit — an inferred join would be ambiguous.
    stmt = select(Ticket).join(User, Ticket.employee_id == User.id)

    if q:
        needle = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            Ticket.subject.ilike(needle)
            | Ticket.description.ilike(needle)
            | Ticket.id.ilike(needle)
            | User.name.ilike(needle)
        )

    if status:
        stmt = stmt.where(Ticket.status == status)
    if category:
        stmt = stmt.where(Ticket.category == category)
    if priority:
        stmt = stmt.where(Ticket.priority == priority)
    if assignee:
        stmt = stmt.where(Ticket.assignee_id == assignee)

    column = SORT_FIELDS.get(sort, Ticket.updated_at)
    direction = "asc" if direction == "asc" else "desc"
    stmt = stmt.order_by(column.asc() if direction == "asc" else column.desc())

    return list(db.execute(stmt).scalars().all())


def validate_inbox_filters(
    *, status: str | None, category: str | None, priority: str | None
) -> None:
    """Give a useful 422 instead of silently-empty tables on bad filter values."""
    bad = []
    if status and status not in STATUSES:
        bad.append(f"status (one of: {', '.join(STATUSES)})")
    if category and category not in CATEGORIES:
        bad.append(f"category (one of: {', '.join(CATEGORIES)})")
    if priority and priority not in PRIORITIES:
        bad.append(f"priority (one of: {', '.join(PRIORITIES)})")
    if bad:
        raise HTTPException(status_code=422, detail="Invalid value for " + "; ".join(bad))
