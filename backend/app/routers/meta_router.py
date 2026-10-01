"""
Router: shared reference data — used by EVERY screen with a dropdown.

FUNCTIONALITY / ENDPOINT MAP:
    GET /api/meta  -> single payload replacing the exports of
        src/data/users.js that the frontend imports directly today:

        users       - Thread.jsx builds conversation headers, the Inbox
                      table shows employee/assignee names via nameOf()
        agents      - TicketDetail.jsx "Assignee" AgentControls dropdown and
                      TicketTable.jsx's assignee filter (HR_AGENTS)
        categories  - TicketForm.jsx category select + AgentControls
                      "Re-categorise" + Inbox category filter (CATEGORIES)
        priorities  - TicketForm.jsx priority select + AgentControls
                      priority dropdown + Inbox filter (PRIORITIES)
        statuses    - AgentControls status dropdown + Inbox filter +
                      HRDashboard FIG.01 keys (STATUSES)

    Available to any signed-in user (employee or agent) — no role gate,
    because both sides need these lists. While the frontend transition is in
    flight, keep src/data/users.js strings and app/constants.py in exact sync.
"""

from fastapi import APIRouter

from app.constants import ROLE_AGENT, CATEGORIES, PRIORITIES, STATUSES
from app.dependencies import CurrentUser, DbSession
from app.schemas.user_schemas import MetaOut, UserOut
from app.services import auth_service

router = APIRouter(prefix="/api/meta", tags=["meta / shared reference data"])


@router.get("", response_model=MetaOut)
def get_meta(db: DbSession, _user: CurrentUser):
    """Dropdown + lookup data shared by the ticket screens."""
    users = auth_service.list_users(db)
    return MetaOut(
        users=[UserOut.model_validate(u) for u in users],
        agents=[UserOut.model_validate(u) for u in users if u.role == ROLE_AGENT],
        categories=list(CATEGORIES),
        priorities=list(PRIORITIES),
        statuses=list(STATUSES),
    )
