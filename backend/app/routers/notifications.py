"""In-app notifications API.

Every endpoint is scoped by the acting user (`userId`, the mock-auth
stand-in for a JWT/user token) and only ever touches rows whose
recipient_id equals that user — there is no way to read or mark someone
else's notifications through this router.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.config import get_client
from app.models import NotificationRead
from app.notifications import run_retention_cleanup, run_sla_sweep
from app.routers.tickets_core import get_user, rows_of

router = APIRouter(prefix="/notifications", tags=["notifications"])

MAX_PAGE = 100


def _table():
    return get_client().table("notifications")


def _require_user(user_id: str) -> dict:
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=422, detail="userId does not match a known user")
    return user


def _stamp_read(row: dict) -> dict:
    return {
        "id": row["id"],
        "recipientId": row["recipient_id"],
        "ticketId": row.get("ticket_id"),
        "ticketRef": row.get("ticket_ref"),
        "type": row["type"],
        "channel": row["channel"],
        "actorName": row.get("actor_name"),
        "payload": row.get("payload", {}),
        "message": row.get("message", ""),
        "read": row["read"],
        "readAt": row.get("read_at"),
        "createdAt": row["created_at"],
    }


@router.get("")
def list_notifications(userId: str, state: str = "all", limit: int = 20, offset: int = 0):
    """GET /notifications?userId=&state=unread&limit=20&offset= — newest-first,
    hard-scoped to the acting user (chronological, not unread-first)."""
    _require_user(userId)
    if state not in ("all", "unread"):
        raise HTTPException(status_code=422, detail="state must be 'all' or 'unread'")
    if limit < 1 or limit > MAX_PAGE:
        raise HTTPException(status_code=422, detail=f"limit must be 1..{MAX_PAGE}")
    if offset < 0:
        raise HTTPException(status_code=422, detail="offset must be >= 0")

    query = (
        _table()
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", desc=True)
        .limit(offset + limit)
    )
    if state == "unread":
        query = query.eq("read", False)

    rows = rows_of(query)[offset:]
    return [_stamp_read(r) for r in rows]


@router.get("/unread-count")
def unread_count(userId: str):
    _require_user(userId)
    rows = rows_of(
        _table().select("id").eq("recipient_id", userId).eq("read", False)
    )
    return {"unread": len(rows)}


@router.post("/read-all")
def mark_all_read(body: NotificationRead):
    _require_user(body.user_id)
    rows = rows_of(
        _table()
        .update({"read": True, "read_at": _utc_now()})
        .eq("recipient_id", body.user_id)
        .eq("read", False)
        .select("*")
    )
    return {"updated": len(rows)}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, body: NotificationRead):
    _require_user(body.user_id)
    rows = rows_of(
        _table()
        .update({"read": True, "read_at": _utc_now()})
        .eq("id", notification_id)
        .eq("recipient_id", body.user_id)  # not-yours rows simply do not match
        .select("*")
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _stamp_read(rows[0])


@router.post("/sweep")
def sweep(body: NotificationRead):
    """Manually run the SLA sweep + retention cleanup — the same calls the
    background scheduler makes every 30 minutes; here for ops/test rigs."""
    _require_user(body.user_id)
    return {"slaNotified": run_sla_sweep(), "deleted": run_retention_cleanup()}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
