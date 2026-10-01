"""
Database model: ticket id sequence.

FUNCTIONALITY:
    Generates the human-readable ticket ids shown on every screen
    ("TKT-101", "TKT-102", ...). Mirrors the `nextSeq` counter in
    src/data/store.js createTicket(). A single-row table is the simplest
    race-safe way to do that in MySQL: new_ticket_id() in
    services/ticket_service.py increments it atomically with a
    SELECT ... FOR UPDATE, so two people creating tickets at the same
    moment can never receive the same id.
"""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TicketCounter(Base):
    __tablename__ = "ticket_counters"

    # one row per counter; the app only ever uses the row named "ticket"
    name: Mapped[str] = mapped_column(String(32), primary_key=True, default="ticket")
    last_value: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
