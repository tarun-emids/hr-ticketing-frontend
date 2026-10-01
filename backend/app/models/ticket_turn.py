"""
Database model: one message ("turn") inside a ticket conversation.

FUNCTIONALITY:
    Serves the conversation thread on TicketDetail.jsx (components/Thread.jsx).
    The first turn shown on that screen is the ticket description itself;
    everything below it (both the employee's replies and HR agents' replies,
    including the automatic "picked it up" message that appears when an agent
    claims a ticket) is a row in this table through POST /api/tickets/{id}/replies.

   Mirrors the object pushed in src/data/store.js addReply():

        { authorId, role: "employee" | "agent", text, at }
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.ticket import utcnow


class TicketTurn(Base):
    __tablename__ = "ticket_turns"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_id: Mapped[str] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    # denormalised from users.role so replies stay historically correct even
    # if a user's role ever changes
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    ticket: Mapped["Ticket"] = relationship(back_populates="turns")  # noqa: F821
    author: Mapped["User"] = relationship(lazy="joined")  # noqa: F821
