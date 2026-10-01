"""
Router: authentication — serves the LOGIN SCREEN (src/pages/Login.jsx).

FUNCTIONALITY / ENDPOINT MAP:
    GET  /api/auth/users?role=  -> the demo users the sign-in card lists.
        The frontend currently does `USERS.filter((u) => u.role === role)`
        against src/data/users.js; this endpoint is its replacement, so the
        two role tabs ("Employee" / "HR agent") and their user dropdowns fill
        from MySQL. Pass ?role=employee or ?role=agent to filter.

    POST /api/auth/login        -> body { userId }. Issues a bearer token
        (row in auth_sessions) and returns { token, user }. This is the
        server-side version of what AuthContext.jsx does today with
        localStorage["hrdesk.user"] — demo auth, no password, exactly as the
        screen advertises ("DEMO AUTH · NO CREDENTIALS CHECKED").

    POST /api/auth/logout       -> discards the caller's token. Frontend
        equivalent: the Layout header's sign-out clearing AuthContext.

    GET  /api/auth/me           -> session restore — same shape as the saved
        user, lets the React app rehydrate its AuthContext after a refresh
        (requires the Authorization header).

    The token issued here is validated by get_current_user in
    app/dependencies.py on every protected endpoint.
"""

from fastapi import APIRouter, HTTPException, Request

from app.constants import ROLES
from app.dependencies import CurrentUser, DbSession
from app.schemas.user_schemas import LoginRequest, TokenOut, UserOut
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth / Login screen"])


@router.get("/users", response_model=list[UserOut])
def list_demo_users(db: DbSession, role: str | None = None):
    """Demo users behind the two role tabs of the Login screen."""
    if role is not None and role not in ROLES:
        raise HTTPException(status_code=422, detail=f"role must be one of: {', '.join(ROLES)}")
    return [UserOut.model_validate(u) for u in auth_service.list_users(db, role)]


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, db: DbSession):
    """Demo sign-in: exchange a picked userId for a bearer token + user."""
    token, user = auth_service.login(db, user_id=body.user_id)
    return TokenOut(token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def who_am_i(user: CurrentUser):
    """Current session's user (rehydrates the frontend AuthContext)."""
    return UserOut.model_validate(user)


@router.post("/logout")
def logout(request: Request, db: DbSession):
    """Invalidate the presented token."""
    _, _, token = request.headers.get("Authorization", "").partition(" ")
    auth_service.logout(db, token=token.strip())
    return {"ok": True}
