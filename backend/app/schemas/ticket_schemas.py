"""
Schemas: tickets and their conversation turns.

FUNCTIONALITY:
    Wire format for the ticket-backed screens:
      EmployeeDashboard  <-  list[TicketOut]          (GET /api/my-tickets)
      NewTicket          <-  TicketOut                (POST /api/tickets body)
      TicketDetail       <-  TicketOut                (GET /api/tickets/{id})
                                                          POST .../replies
                                                          PATCH status/assignee/priority/category
      HRInbox            <-  list[TicketOut]          (GET /api/inbox)

    Field names deliberately mirror the mock objects in src/data/store.js so
    screens keep rendering unchanged after the store.js -> API switch
    ( CamelModel turns our snake_case fields into camelCase on the wire ).
    Dates serialize as ISO-8601 strings, which the frontend feeds into
    Date.parse() / timeAgo() in src/utils.js.
"""

from datetime import datetime
from typing import Optional

from app.models import Ticket, TicketTurn
from app.schemas.base import CamelModel


class AttachmentMetaOut(CamelModel):
    """Mirrors the {name, size} object TicketForm.jsx sends for attachments."""

    name: str
    size: int


class TurnOut(CamelModel):
    """One conversation message — mirrors the turns[] objects in store.js."""

    author_id: str
    role: str
    text: str
    at: datetime


class TicketOut(CamelModel):
    id: str
    employee_id: str
    category: str
    subject: str
    description: str
    priority: str
    status: str
    assignee_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    first_reply_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    turns: list[TurnOut] = []
    attachment: Optional[AttachmentMetaOut] = None

    @classmethod
    def from_ticket(cls, t: Ticket, *, include_turns: bool = True) -> "TicketOut":
        """
        Build the wire object from an ORM row. include_turns=False lets the
        heavy list endpoints (inbox / employee dashboard) skip loading the
        full thread — the screens only use turns on the detail page.
        """
        return cls(
            id=t.id,
            employee_id=t.employee_id,
            category=t.category,
            subject=t.subject,
            description=t.description,
            priority=t.priority,
            status=t.status,
            assignee_id=t.assignee_id,
            created_at=t.created_at,
            updated_at=t.updated_at,
            first_reply_at=t.first_reply_at,
            resolved_at=t.resolved_at,
            closed_by=t.closed_by,
            turns=(
                [
                    TurnOut(
                        author_id=turn.author_id,
                        role=turn.role,
                        text=turn.text,
                        at=turn.created_at,
                    )
                    for turn in t.turns
                ]
                if include_turns
                else []
            ),
            attachment=(
                AttachmentMetaOut(name=t.attachment_name, size=t.attachment_size)
                if t.attachment_name is not None
                else None
            ),
        )


# ---------------------------------------------------------------------------
# Request bodies (validated against the same rules the frontend forms use)
# ---------------------------------------------------------------------------


class CreateTicketRequest(CamelModel):
    """Body of POST /api/tickets — mirrors TicketForm.jsx's submission."""

    category: str
    subject: str
    description: str
    priority: str
    attachment: Optional[AttachmentMetaOut] = None


class ReplyRequest(CamelModel):
    """Body of POST /api/tickets/{id}/replies — Thread.jsx's reply box."""

    text: str


class StatusUpdateRequest(CamelModel):
    """Body of PATCH /api/tickets/{id}/status — TicketDetail AgentControls."""

    status: str


class AssigneeUpdateRequest(CamelModel):
    """Body of PATCH /api/tickets/{id}/assignee. send null/omitted = unassign."""

    assignee_id: Optional[str] = None


class PriorityUpdateRequest(CamelModel):
    """Body of PATCH /api/tickets/{id}/priority — AgentControls dropdown."""

    priority: str


class CategoryUpdateRequest(CamelModel):
    """Body of PATCH /api/tickets/{id}/category — 'Re-categorise' dropdown."""

    category: str


__all__ = [
    "AttachmentMetaOut",
    "TurnOut",
    "TicketOut",
    "CreateTicketRequest",
    "ReplyRequest",
    "StatusUpdateRequest",
    "AssigneeUpdateRequest",
    "PriorityUpdateRequest",
    "CategoryUpdateRequest",
]
