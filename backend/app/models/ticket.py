"""
Database model: HR ticket.

FUNCTIONALITY:
    This table is the backbone of every screen in the app:

      EmployeeDashboard.jsx  - lists tickets WHERE employee_id = current user
      NewTicket.jsx          - INSERTs a row here with status "Open"
      TicketDetail.jsx       - SELECTs one row + its conversation turns, and
                               PATCHes status/assignee/priority/category
      HRInbox.jsx            - SELECTs across all employees with search,
                               filters and column sorting
      HRDashboard.jsx        - aggregates counts + average first-response time

    The columns directly mirror the mock ticket object produced in
    src/data/tickets.js and src/data/store.js createTicket() so the JSON
    returned by the API keeps the exact same shape the frontend expects:

        id, employeeId, category, subject, description, priority, status,
        assigneeId, createdAt, updatedAt, firstReplyAt, resolvedAt,
        closedBy, turns[], attachment {name, size}

    snapshot fields (subject, description, category...) are duplicated on the
    turn rows on purpose so the thread never changes retroactively.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    """Naive-UTC timestamp factory used for created/updated columns."""
    from datetime import timezone  # local import keeps the top clean

    return datetime.now(timezone.utc).replace(tzinfo=None)


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)  # "TKT-101"
    employee_id: Mapped[str] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    # assignee_id / closed_by point at HR agents (nullable while unassigned)
    assignee_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    closed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    category: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    # Text (not String) because MySQL cannot create a VARCHAR without an
    # explicit length — long ticket descriptions don't want one.
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    # string rather than a MySQL ENUM type keeps parity with the frontend's
    # exact values ("Waiting on Employee" etc.) and avoids migration friction.
    status: Mapped[str] = mapped_column(String(24), nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    # first agent reply timestamp — powers TicketDetail "resolved/closed" meta
    # and the HR dashboard's average-response metric (FIG. 03).
    first_reply_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # attachment metadata only (name + byte size), matching what TicketForm.jsx
    # currently sends; a real file store can be added later with an upload id.
    attachment_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attachment_size: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # every message in the conversation, ordered oldest first
    turns: Mapped[list["TicketTurn"]] = relationship(  # noqa: F821
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketTurn.created_at",
    )

    # helpers so services can replace the `.find()` lookups the frontend does
    employee: Mapped["User"] = relationship(  # noqa: F821
        back_populates="tickets_opened", foreign_keys=[employee_id], lazy="joined"
    )
    assignee: Mapped["User | None"] = relationship(  # noqa: F821
        back_populates="tickets_assigned", foreign_keys=[assignee_id], lazy="joined"
    )

    def __repr__(self) -> str:
        return f"<Ticket {self.id} [{self.status}]>"
