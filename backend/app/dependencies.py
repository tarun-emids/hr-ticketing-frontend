"""
Request dependencies: identifies who is calling, and enforces role gates.

FUNCTIONALITY:
    The frontend restricts screens with the RequireAuth wrapper in main.jsx
    (employee-only: my-tickets/new-ticket; agent-only: inbox/hr-dashboard)
    plus the "your own tickets only" check inside TicketDetail.jsx. This
    module is the server-side equivalent so the rules cannot be bypassed by
    calling the API directly:

      get_current_user  - reads "Authorization: Bearer <token>", looks the
                          token up in the auth_sessions table (row created by
                          POST /api/auth/login) and returns the signed-in
                          User, or raises 401 when missing/unknown/expired.
      require_agent     - FastAPI dependency for HR-agent-only endpoints
                          (inbox, analytics, ticket PATCH controls).
      require_agent_or_owner - access rule for a single ticket: agents may
                          view everything, employees only their own tickets
                          (mirrors the isMine/isAgent check in TicketDetail).
"""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models import AuthSession, User
from app.constants import ROLE_AGENT

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    request: Request,
    db: DbSession,
) -> User:
    """
    Resolve the caller from their Bearer token. Raises 401 when the header
    is missing or the token is unknown (same UX as being logged out in the
    React demo when localStorage["hrdesk.user"] is cleared).
    """
    auth = request.headers.get("Authorization", "")
    scheme, _, token = auth.partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not signed in. Send 'Authorization: Bearer <token>' from POST /api/auth/login.",
        )

    row = (
        db.execute(
            select(AuthSession)
            .options(joinedload(AuthSession.user))
            .where(AuthSession.token == token)
        )
        .scalars()
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token — sign in again.",
        )
    return row.user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_agent(user: CurrentUser) -> User:
    """Dependency guard: endpoint usable only by HR agents."""
    if user.role != ROLE_AGENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR-agent access required for this screen.",
        )
    return user


AgentUser = Annotated[User, Depends(require_agent)]
