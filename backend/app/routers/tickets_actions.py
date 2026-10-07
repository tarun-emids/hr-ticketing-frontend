"""Ticket lifecycle mutations: status, assignee, priority, category.

Also hosts the shared `_assign` core used by both the manual PATCH /assignee
endpoint and the router in assignment.py (auto-assign).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.config import db, get_client
from app.models import (
    AGENT_PICKUP_TEXT,
    AssigneeUpdate,
    CategoryUpdate,
    PriorityUpdate,
    StatusUpdate,
)
from app.notifications import (
    EV_ASSIGNED,
    EV_STATUS,
    assigned_recipients,
    safe_notify,
    status_recipients,
)
from app.routers.tickets_core import (
    _update_and_return,
    fetch_row,
    get_user,
    rows_of,
    run,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.patch("/{tid}/status")
def update_status(tid: str, payload: StatusUpdate):
    """store.js updateStatus parity: Resolved stamps resolvedAt, Closed also
    stamps closedBy, reopening clears both."""
    row = fetch_row(tid)

    actor = get_user(payload.actor_id)
    if not actor:
        raise HTTPException(status_code=422, detail="actorId does not match a known user")

    patch: dict = {"status": payload.status}
    if payload.status == "Resolved":
        patch["resolved_at"] = _now()
    elif payload.status == "Closed":
        patch["resolved_at"] = row.get("resolved_at") or _now()
        patch["closed_by"] = payload.actor_id
    elif payload.status in ("Open", "In Progress"):
        patch["resolved_at"] = None
        patch["closed_by"] = None
    # Waiting on Employee: no timestamp changes
    result = _update_and_return(tid, patch)
    safe_notify(
        result,
        EV_STATUS,
        actor,
        status_recipients(row["employee_id"], row.get("assignee_id"), actor["id"]),
        payload={"status": payload.status},
    )
    return result


def _assign(row: dict, assignee_id: str | None) -> dict:
    """Core assignment flow (manual + auto both land here).

    store.js assignTicket parity: assigning an unanswered ticket also posts the
    agent pickup reply, sets firstReplyAt, and moves Open -> In Progress.
    """
    if assignee_id:
        agent = get_user(assignee_id)
        if not agent:
            raise HTTPException(status_code=422, detail="assigneeId does not match a known user")
        if agent["role"] != "agent":
            raise HTTPException(status_code=422, detail="assigneeId must be an HR agent")

    has_agent_turn = bool(
        rows_of(
            get_client().table("replies").select("id")
            .eq("ticket_id", row["id"]).eq("author_role", "agent").limit(1)
        )
    )

    now = _now()
    if assignee_id and not row.get("first_reply_at") and not has_agent_turn:
        rows_of(
            get_client().table("replies").insert({
                "ticket_id": row["id"],
                "author_id": assignee_id,
                "author_role": "agent",
                "body": AGENT_PICKUP_TEXT,
            }).select("*")
        )
        patch: dict = {"assignee_id": assignee_id, "first_reply_at": now}
        if row["status"] == "Open":
            patch["status"] = "In Progress"
        result = _update_and_return(row["ref"], patch)
        _notify_assign(row, assignee_id)
        return result

    result = _update_and_return(row["ref"], {"assignee_id": assignee_id})
    _notify_assign(row, assignee_id)
    return result


def _notify_assign(pre_row: dict, assignee_id: str | None):
    """Notify on actual reassignment only (re-picking the same agent stays quiet)."""
    if pre_row.get("assignee_id") != assignee_id:
        safe_notify(pre_row, EV_ASSIGNED, None, assigned_recipients(assignee_id, None))


@router.patch("/{tid}/assignee")
def assign_ticket(tid: str, payload: AssigneeUpdate):
    row = fetch_row(tid)
    return _assign(row, payload.assignee_id)


@router.patch("/{tid}/priority")
def set_priority(tid: str, payload: PriorityUpdate):
    return _update_and_return(tid, {"priority": payload.priority})


@router.patch("/{tid}/category")
def set_category(tid: str, payload: CategoryUpdate):
    return _update_and_return(tid, {"category": payload.category})