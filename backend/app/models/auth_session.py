"""
Database model: demo authentication sessions.

FUNCTIONALITY:
    Backs the Login.jsx screen. That screen picks a user from a dropdown and
    signs in with no password (it is labelled "DEMO AUTH · NO CREDENTIALS
    CHECKED"). POST /api/auth/login issues a random token stored here; the
    middleware in app/dependencies.py then exchanges the
    "Authorization: Bearer <token>" header for the signed-in user on every
    protected endpoint (my-tickets, ticket detail, inbox, analytics...).

    Think of this table as the server-side replacement for the
    localStorage["hrdesk.user"] entry that AuthContext.jsx currently uses.
"""

import secrets
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.ticket import utcnow


def new_token() -> str:
    """256-bit random token — unguessable even though demo auth has no password."""
    return secrets.token_hex(32)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped["User"] = relationship(lazy="joined")  # noqa: F821
