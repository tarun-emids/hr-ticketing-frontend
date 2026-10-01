"""
Authentication service (demo auth for the Login screen).

FUNCTIONALITY:
    Replaces AuthContext.jsx's localStorage approach with real sessions:

      login()    - POST /api/auth/login. Takes the user id picked on the
                   Login screen, creates an auth_sessions row, returns
                   (token, user). By design there is no password: the UI
                   already advertises "DEMO AUTH · NO CREDENTIALS CHECKED".
                   To harden later: add a password_hash column to the users
                   table and verify it here before issuing the token.

      user_by_id() - shared lookup, also used by the meta endpoint.

      logout()   - POST /api/auth/logout deletes the caller's session row so
                   the token stops working everywhere immediately.
"""

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import AuthSession, User, new_token

DEFAULT_EMPLOYEE_ID = "u1"  # what the Login screen preselects


def user_by_id(db: Session, user_id: str) -> User | None:
    return db.execute(select(User).where(User.id == user_id)).scalars().first()


def list_users(db: Session, role: str | None = None) -> list[User]:
    """
    Users shown by the Login screen's role picker. `role` filters to
    "employee" or "agent"; None returns everyone (replaces the USERS export).
    """
    stmt = select(User).order_by(User.name)
    if role is not None:
        stmt = stmt.where(User.role == role)
    return list(db.execute(stmt).scalars().all())


def login(db: Session, *, user_id: str) -> tuple[str, User]:
    """
    Issue a fresh bearer token for the requested demo user.
    404 mirrors picking an id that the dropdown could never offer (e.g. the
    user was deleted after the page had loaded).
    """
    user = user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Unknown demo user.")
    token = new_token()
    db.add(AuthSession(token=token, user_id=user.id))
    db.commit()
    return token, user


def logout(db: Session, *, token: str) -> None:
    """Invalidate the caller's session row (no-op if already gone)."""
    db.execute(delete(AuthSession).where(AuthSession.token == token))
    db.commit()
