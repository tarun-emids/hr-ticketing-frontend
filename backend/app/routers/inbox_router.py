"""
Router: HR inbox — serves the HR INBOX SCREEN (src/pages/HRInbox.jsx).

FUNCTIONALITY / ENDPOINT MAP:
    GET /api/inbox   -> every ticket from every employee, feeding the
        searchable/filterable/sortable TicketTable. Agent-only (the route is
        behind RequireAuth role="agent" in the frontend's main.jsx too).

    Query parameters (all optional) — one per control in the filter panel of
    components/TicketTable.jsx:

        q          free text: subject, description, ticket id, employee name
        status     exact match: Open / In Progress / Waiting on Employee /
                   Resolved / Closed
        category   Payroll / Leave / Benefits / Onboarding / Policy / Other
        priority   Low / Medium / High / Urgent
        assignee   agent user id ("Unassigned" pill currently filters in the
                   browser only — pass assignee=none here to get unassigned)
        sort       updated | created | priority | subject | employee | status
        dir        asc | desc (default desc, i.e. newest activity first)

        NOTE on "assignee=none": the frontend's select for assignee shows
        "Unassigned" as an empty value; pass the literal "none" when the HR
        officer wants the unassigned-only view so "none" is unambiguous.

    Responses skip conversation turns (include_turns=False) — the table rows
    never render them, and analytics endpoint covers aggregate needs.
"""

from fastapi import APIRouter

from app.dependencies import AgentUser, DbSession
from app.schemas.ticket_schemas import TicketOut
from app.services import inbox_service

router = APIRouter(prefix="/api/inbox", tags=["inbox / HR Inbox screen"])


@router.get("", response_model=list[TicketOut])
def inbox(
    db: DbSession,
    _agent: AgentUser,
    q: str | None = None,
    status: str | None = None,
    category: str | None = None,
    priority: str | None = None,
    assignee: str | None = None,
    sort: str = "updated",
    dir: str = "desc",
):
    """All tickets with server-side search/filter/sort (TicketTable data)."""
    inbox_service.validate_inbox_filters(status=status, category=category, priority=priority)

    rows = inbox_service.search_tickets(
        db,
        q=q,
        status=status,
        category=category,
        priority=priority,
        assignee=None if assignee == "none" else assignee,
        sort=sort,
        direction=dir,
    )
    # "none" -> unassigned tickets only; anything else exact-matches agent id
    if assignee == "none":
        rows = [t for t in rows if t.assignee_id is None]

    return [TicketOut.from_ticket(t, include_turns=False) for t in rows]
