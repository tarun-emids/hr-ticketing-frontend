"""
Ticket business logic.

FUNCTIONALITY:
    Port of every mutation in src/data/store.js into the database — this
    file is the rulebook the whole ticketing flow relies on:

      create_ticket()   mirrors store.createTicket(): assigns the next
                        TKT-<n> id from the ticket_counters row, sets status
                        "Open", unassigned, empty thread, timestamped.

      add_reply()       mirrors store.addReply():
                          * agent turn sets firstReplyAt (if unset) and
                            moves "Open" -> "In Progress" when the last
                            interaction was already the agent's
                          * employee turn on a live ticket sets status
                            "Waiting on Employee" (HR is no longer holding
                            the ball)
                          both stamp updatedAt, which is what the list
                          screens sort by.

      update_status()   mirrors store.updateStatus():
                          * Resolved stamps resolvedAt
                          * Closed stamps closedBy (and resolvedAt once)
                          * reopening (Open/In Progress) clears both stamps

      assign_ticket()   mirrors store.assignTicket(): claiming an unassigned
                        ticket that has never been answered auto-posts the
                        "picked it up" greeting turn from the assigning
                        agent, stamps firstReplyAt and moves Open -> In
                        Progress. Assigning null unassigns.

      set_priority() / set_category()  mirror the same-named store helpers
                        (value checked against app/constants.py first).

    TicketForm.jsx's length/validation rules live with these functions
    (validate_new_ticket) so raw API calls obey the same constraints as the
    UI - minimum subject 5 chars, minimum description 20 chars, attachment
    cap 5 MB, and category/priority must be exact values from constants.

    Every service takes the caller (User) because several rules depend on
    who is acting: replies use the caller's role, closing stamps their id,
    and PATCH controls are agent-gated at the router level.
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import (
    CATEGORIES,
    MAX_ATTACHMENT_BYTES,
    PRIORITIES,
    STATUSES,
    TICKET_ID_PREFIX,
)
from app.models import Ticket, TicketCounter, TicketTurn, User

AUTO_PICKUP_TEXT = (
    "Thanks for raising this — I've picked it up and will get back to you shortly."
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# validation (server-side twin of TicketForm.jsx's validate())
# ---------------------------------------------------------------------------


def validate_new_ticket(
    *, category: str, subject: str, description: str, priority: str, attachment
) -> None:
    """Mirror of TicketForm.jsx validate() with the same error semantics; the
    frontend shows friendly messages, the API returns the same text via 422."""
    problems: list[str] = []
    if len(subject.strip()) < 5:
        problems.append("Subject needs at least 5 characters.")
    if len(description.strip()) < 20:
        problems.append(
            "Add a little more detail so HR can help faster (min 20 characters)."
        )
    if category not in CATEGORIES:
        problems.append(f"Choose a category from: {', '.join(CATEGORIES)}.")
    if priority not in PRIORITIES:
        problems.append(f"Choose a priority from: {', '.join(PRIORITIES)}.")
    if attachment is not None and (attachment.size or 0) > MAX_ATTACHMENT_BYTES:
        mb = (attachment.size or 0) / 1024 / 1024
        problems.append(f"File is larger than 5 MB ({mb:.1f} MB).")
    if problems:
        raise HTTPException(status_code=422, detail=" ".join(problems))


def _require(value: str, allowed: list[str], label: str) -> None:
    if value not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"{label} must be one of: {', '.join(allowed)}",
        )


# ---------------------------------------------------------------------------
# id generation
# ---------------------------------------------------------------------------


def new_ticket_id(db: Session) -> str:
    """
    Atomically bumps the single ticket_counters row and formats the next id
    ("TKT-119", ...).

    On MySQL the SELECT ... FOR UPDATE row lock makes this safe when two
    employees press "Submit ticket" in the same instant. SQLite serializes
    writers with a file-level lock instead and has no row locks, so the
    qualifier is skipped there (SQLAlchemy would silently ignore it anyway).
    """
    stmt = select(TicketCounter).where(TicketCounter.name == "ticket")
    if db.bind is not None and db.bind.dialect.name != "sqlite":
        stmt = stmt.with_for_update()
    counter = db.execute(stmt).scalars().first()
    if counter is None:  # counter row missing (e.g. manual DB surgery) — heal it
        counter = TicketCounter(name="ticket", last_value=100)
        db.add(counter)
        db.flush()
    counter.last_value += 1
    return f"{TICKET_ID_PREFIX}-{counter.last_value}"


# ---------------------------------------------------------------------------
# reads
# ---------------------------------------------------------------------------


def list_for_employee(db: Session, employee_id: str) -> list[Ticket]:
    """EmployeeDashboard listing: own tickets, newest activity first."""
    return list(
        db.execute(
            select(Ticket)
            .where(Ticket.employee_id == employee_id)
            .order_by(Ticket.updated_at.desc())
        )
        .scalars()
        .all()
    )


def get(db: Session, ticket_id: str) -> Ticket | None:
    """TicketDetail fetch: one ticket; turns arrive via the relationship."""
    return db.execute(select(Ticket).where(Ticket.id == ticket_id)).scalars().first()


def check_access(ticket: Ticket, user) -> None:
    """Server-side twin of the isMine/isAgent guard in TicketDetail.jsx:
    agents see everything, employees only their own tickets."""
    if user.role != "agent" and ticket.employee_id != user.id:
        raise HTTPException(status_code=403, detail="No access to this ticket.")


# ---------------------------------------------------------------------------
# mutations
# ---------------------------------------------------------------------------


def create_ticket(
    db: Session,
    *,
    employee_id: str,
    category: str,
    subject: str,
    description: str,
    priority: str,
    attachment_name: str | None,
    attachment_size: int | None,
) -> Ticket:
    now = utcnow()
    ticket = Ticket(
        id=new_ticket_id(db),
        employee_id=employee_id,
        category=category,
        subject=subject.strip(),
        description=description.strip(),
        priority=priority,
        status="Open",
        assignee_id=None,
        created_at=now,
        updated_at=now,
        first_reply_at=None,
        resolved_at=None,
        closed_by=None,
        attachment_name=attachment_name,
        attachment_size=attachment_size,
    )
    db.add(ticket)
    db.flush()  # id assigned before the response serializes
    return ticket


def add_reply(db: Session, ticket: Ticket, *, author, text: str) -> Ticket:
    """Mirrors store.addReply() — see module docstring for the status rules."""
    at = utcnow()
    role = author.role  # "agent" | "employee"
    ticket.turns.append(TicketTurn(author_id=author.id, role=role, text=text, created_at=at))
    ticket.updated_at = at

    if role == "agent":
        if ticket.first_reply_at is None:
            ticket.first_reply_at = at
        if ticket.turns and ticket.turns[-1].role == "agent" and ticket.status == "Open":
            ticket.status = "In Progress"
    elif role == "employee" and ticket.status not in ("Resolved", "Closed"):
        # employee answered back on any live ticket -> ball is with HR now
        # (store.js: !["Resolved","Closed"].includes(status))
        ticket.status = "Waiting on Employee"

    db.flush()
    return ticket


def update_status(db: Session, ticket: Ticket, *, status: str, actor_id: str) -> Ticket:
    """Mirrors store.updateStatus(). Agent-only gating happens in the router."""
    _require(status, STATUSES, "Status")
    ticket.status = status
    if status == "Resolved":
        ticket.resolved_at = utcnow()
    elif status == "Closed":
        # closing without an explicit resolve stamps resolution time too
        ticket.resolved_at = ticket.resolved_at or utcnow()
        ticket.closed_by = actor_id
    else:  # Open / In Progress / Waiting on Employee — a reopen clears stamps
        if status in ("Open", "In Progress"):
            ticket.resolved_at = None
            ticket.closed_by = None
    ticket.updated_at = utcnow()
    db.flush()
    return ticket


def assign_ticket(db: Session, ticket: Ticket, *, assignee_id: str | None) -> Ticket:
    """Mirrors store.assignTicket(), including the auto-greeting on first claim."""
    if assignee_id is not None:  # only real HR agents can be assigned
        agent = db.execute(select(User).where(User.id == assignee_id)).scalars().first()
        if agent is None or agent.role != "agent":
            raise HTTPException(status_code=422, detail="Assignee must be an HR agent.")
    ticket.assignee_id = assignee_id

    if assignee_id is None:
        ticket.updated_at = utcnow()
        db.flush()
        return ticket

    has_agent_turn = any(t.role == "agent" for t in ticket.turns)
    if ticket.first_reply_at is None and not has_agent_turn:
        at = utcnow()
        ticket.first_reply_at = at
        ticket.turns.append(
            TicketTurn(author_id=assignee_id, role="agent", text=AUTO_PICKUP_TEXT, created_at=at)
        )
        if ticket.status == "Open":
            ticket.status = "In Progress"
    ticket.updated_at = utcnow()
    db.flush()
    return ticket


def set_priority(db: Session, ticket: Ticket, *, priority: str) -> Ticket:
    _require(priority, list(PRIORITIES), "Priority")
    ticket.priority = priority
    ticket.updated_at = utcnow()
    db.flush()
    return ticket


def set_category(db: Session, ticket: Ticket, *, category: str) -> Ticket:
    _require(category, list(CATEGORIES), "Category")
    ticket.category = category
    ticket.updated_at = utcnow()
    db.flush()
    return ticket
