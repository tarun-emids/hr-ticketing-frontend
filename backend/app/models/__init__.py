"""
Model bundle — importing this package registers every table.

FUNCTIONALITY:
    Base.metadata.create_all() (called during app startup in app/main.py)
    needs all model classes to have been *imported* before it runs, otherwise
    tables are silently skipped. Importing this package once inside main.py
    guarantees that. Add new model files here when the schema grows.
"""

from app.models.user import User
from app.models.ticket import Ticket
from app.models.ticket_turn import TicketTurn
from app.models.auth_session import AuthSession, new_token
from app.models.ticket_counter import TicketCounter

__all__ = ["User", "Ticket", "TicketTurn", "AuthSession", "new_token", "TicketCounter"]
