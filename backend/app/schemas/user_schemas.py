"""
Schemas: users, authentication and the shared /api/meta payload.

FUNCTIONALITY:
    Serves the Login.jsx screen (user list, login response, current session)
    plus the reference data every other screen needs for its dropdowns and
    name lookups (CATEGORIES/PRIORITIES/STATUSES/HR agents/all users).

    LoginRequest   - body of POST /api/auth/login  { userId: "u1" }
    TokenOut       - { token, user } returned by POST /api/auth/login
    MetaOut        - payload of GET /api/meta (agents, users, categories,
                     priorities, statuses) — replaces src/data/users.js exports
"""

from typing import Literal

from app.constants import ROLE_AGENT, ROLE_EMPLOYEE
from app.schemas.base import CamelModel


class UserOut(CamelModel):
    id: str
    name: str
    email: str
    role: Literal["employee", "agent"]


class LoginRequest(CamelModel):
    # demo auth: just the picked user id, no password (matches the frontend
    # behaviour documented as "NO CREDENTIALS CHECKED")
    user_id: str


class TokenOut(CamelModel):
    token: str
    user: UserOut


class MetaOut(CamelModel):
    users: list[UserOut]
    agents: list[UserOut]
    categories: list[str]
    priorities: list[str]
    statuses: list[str]


# re-exported so routers can import role constants from schemas too
ROLE_LABELS = {ROLE_AGENT: "HR agent", ROLE_EMPLOYEE: "Employee"}
