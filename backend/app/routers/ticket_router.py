"""
Router: tickets — serves THREE screens:

    src/pages/EmployeeDashboard.jsx
        GET /api/my-tickets
        Returns the signed-in employee's own tickets, most recent activity
        first (same sort as store.listTickets()). The frontend row list is
        built by EmployeeDashboard.jsx's `mine = tickets.filter(...)` — here
        that filter happens in SQL (employee_id = caller).

    src/pages/NewTicket.jsx (+ components/TicketForm.jsx)
        POST /api/tickets
        Creates a ticket: status "Open", unassigned, empty thread, id from
        the counters row (TKT-101, 102, ...). Validation mirrors the form's
        rules exactly — subject >= 5 chars, description >= 20 chars,
        category/priority must be real values, attachment metadata caps at
        5 MB — but it runs server-side so it cannot be skipped.

    src/pages/TicketDetail.jsx (+ components/Thread.jsx, AgentControls)
        GET  /api/tickets/{id}          ticket + whole conversation, access
                                        gated: HR agents see everything,
                                        employees only their own tickets
        POST /api/tickets/{id}/replies  conversation turn; role comes from
                                        the token, which drives the status
                                        rules in services/ticket_service
        PATCH /api/tickets/{id}/status     agent-only (AgentControls)
        PATCH /api/tickets/{id}/assignee   agent-only; first claim auto-posts
                                        the "picked it up" greeting turn
        PATCH /api/tickets/{id}/priority   agent-only
        PATCH /api/tickets/{id}/category   agent-only
    The four PATCH endpoints map 1:1 onto store.js's updateStatus /
    assignTicket / setPriority / setCategory — the frontend calls the same
    mutations.

Every endpoint requires a signed-in user (401 otherwise) and converts the
"not found" case into 404 like the `Ticket ${id} not found` EmptyState.
"""

from fastapi import APIRouter, HTTPException, Response, status as http_status

from app.constants import ROLE_AGENT
from app.dependencies import AgentUser, CurrentUser, DbSession
from app.schemas.ticket_schemas import (
    AssigneeUpdateRequest,
    CategoryUpdateRequest,
    CreateTicketRequest,
    PriorityUpdateRequest,
    ReplyRequest,
    StatusUpdateRequest,
    TicketOut,
)
from app.services import ticket_service

router = APIRouter(prefix="/api", tags=["tickets / My tickets, New ticket, Ticket detail"])


# ---------------------------------------------------------------------------
# EmployeeDashboard screen
# ---------------------------------------------------------------------------


@router.get("/my-tickets", response_model=list[TicketOut])
def my_tickets(db: DbSession, user: CurrentUser):
    """Signed-in employee's own tickets, newest-updated first."""
    if user.role == ROLE_AGENT:  # agents own /api/inbox instead
        raise HTTPException(status_code=403, detail="Agents use GET /api/inbox.")
    rows = ticket_service.list_for_employee(db, user.id)
    return [TicketOut.from_ticket(t, include_turns=False) for t in rows]


# ---------------------------------------------------------------------------
# NewTicket screen
# ---------------------------------------------------------------------------


@router.post("/tickets", response_model=TicketOut, status_code=http_status.HTTP_201_CREATED)
def create_ticket(
    body: CreateTicketRequest,
    db: DbSession,
    user: CurrentUser,
    response: Response,
):
    """Validate + persist a new HR request from the New Ticket form."""
    attachment = body.attachment
    ticket_service.validate_new_ticket(
        category=body.category,
        subject=body.subject,
        description=body.description,
        priority=body.priority,
        attachment=attachment,
    )
    ticket = ticket_service.create_ticket(
        db,
        employee_id=user.id,
        category=body.category,
        subject=body.subject,
        description=body.description,
        priority=body.priority,
        attachment_name=attachment.name if attachment else None,
        attachment_size=attachment.size if attachment else None,
    )
    db.commit()
    db.refresh(ticket)
    return TicketOut.from_ticket(ticket)


# ---------------------------------------------------------------------------
# TicketDetail screen
# ---------------------------------------------------------------------------


def _load_ticket(db, ticket_id: str, actor):
    """Shared detail lookup: 404 / 403 mirrors the two EmptyStates on screen."""
    ticket = ticket_service.get(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")
    ticket_service.check_access(ticket, actor)  # 403 for other people's tickets
    return ticket


@router.get("/tickets/{ticket_id}", response_model=TicketOut)
def ticket_detail(ticket_id: str, db: DbSession, user: CurrentUser):
    """Full ticket incl. conversation turns (Thread.jsx data)."""
    ticket = _load_ticket(db, ticket_id, user)
    return TicketOut.from_ticket(ticket)


@router.post("/tickets/{ticket_id}/replies", response_model=TicketOut)
def reply_to_ticket(
    ticket_id: str,
    body: ReplyRequest,
    db: DbSession,
    user: CurrentUser,
):
    """Post a conversation turn as the signed-in user.

    Thread.jsx requires >= 2 chars before enabling Send — enforced here too,
    mirroring the UX but server-side."""
    text = body.text.strip()
    if len(text) < 2:
        raise HTTPException(status_code=422, detail="Reply is too short.")
    ticket = _load_ticket(db, ticket_id, user)
    ticket_service.add_reply(db, ticket, author=user, text=text)
    db.commit()
    db.refresh(ticket)
    return TicketOut.from_ticket(ticket)


def _agent_patch(db, ticket_id: str, mutate, **kwargs):
    """Common PATCH plumbing: agent-gated, commits, returns fresh detail."""
    ticket = ticket_service.get(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")
    mutate(db, ticket, **kwargs)
    db.commit()
    db.refresh(ticket)
    return TicketOut.from_ticket(ticket)


@router.patch("/tickets/{ticket_id}/status", response_model=TicketOut)
def patch_status(
    ticket_id: str,
    body: StatusUpdateRequest,
    db: DbSession,
    agent: AgentUser,
):
    """Agent-only: change ticket state (AgentControls STATUS dropdown)."""
    return _agent_patch(
        db, ticket_id, ticket_service.update_status, status=body.status, actor_id=agent.id
    )


@router.patch("/tickets/{ticket_id}/assignee", response_model=TicketOut)
def patch_assignee(
    ticket_id: str,
    body: AssigneeUpdateRequest,
    db: DbSession,
    agent: AgentUser,
):
    """Agent-only: claim/unclaim a ticket (AgentControls ASSIGNEE dropdown).

    First claim on an unanswered ticket auto-posts the greeting turn, stamps
    first_reply_at and moves Open -> In Progress (services.assign_ticket)."""
    return _agent_patch(db, ticket_id, ticket_service.assign_ticket, assignee_id=body.assignee_id)


@router.patch("/tickets/{ticket_id}/priority", response_model=TicketOut)
def patch_priority(
    ticket_id: str,
    body: PriorityUpdateRequest,
    db: DbSession,
    agent: AgentUser,
):
    """Agent-only: re-slap urgency (AgentControls PRIORITY dropdown)."""
    return _agent_patch(db, ticket_id, ticket_service.set_priority, priority=body.priority)


@router.patch("/tickets/{ticket_id}/category", response_model=TicketOut)
def patch_category(
    ticket_id: str,
    body: CategoryUpdateRequest,
    db: DbSession,
    agent: AgentUser,
):
    """Agent-only: re-categorise (AgentControls RE-CATEGORISE dropdown)."""
    return _agent_patch(db, ticket_id, ticket_service.set_category, category=body.category)
