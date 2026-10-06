"""Notification domain: recipients, generic messages, emit, SLA sweep.

Design constraints:
- Ticket writes stay decoupled from notification logic: every emit call is
  wrapped in safe_notify(), which swallows (and logs) any failure. A broken
  notification path can never break a ticket action.
- Rows are channel-agnostic (channel='in_app' today) so future channels can
  reuse the same store.
- Messages are generic on purpose — no ticket subject, description or reply
  body ever lands in a notification row (HR tickets are sensitive).
- This module must not import app.routers.* (routers import it, so importing
  back would create a cycle). It talks to Supabase with its own small helpers.
"""
import logging
from datetime import datetime, timedelta, timezone

from app.config import db, get_client

log = logging.getLogger("hrdesk.notifications")

EV_CREATED = "ticket_created"
EV_ASSIGNED = "ticket_assigned"
EV_STATUS = "ticket_status_changed"
EV_REPLY = "ticket_reply"
EV_SLA = "sla_breached"

SLA_THRESHOLDS_HOURS = {  # hours an unassigned ticket may wait for first contact
    "Urgent": 4,
    "default": 24,
}
SLA_SWEEP_INTERVAL_SECONDS = 1800
RETENTION_READ_DAYS = 30
RETENTION_UNREAD_DAYS = 180


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return now_utc().isoformat()


def _rows(query) -> list:
    """Execute and unwrap — mirrors tickets_core.unwrap without importing it."""
    res = query.execute()
    data = getattr(res, "data", res)
    if isinstance(data, tuple) and len(data) == 2:
        data = data[0]
    return data or []


# ---------------------------------------------------------------------------
# Recipient rules (pure — no DB access, easy to unit test)
# ---------------------------------------------------------------------------

def created_recipients(agent_ids: list) -> list:
    """A new ticket informs every HR agent (the actor is the employee)."""
    return list(agent_ids)


def assigned_recipients(assignee_id, actor_id):
    """Assignment informs the new assignee only; assigning to yourself is a
    no-op and clearing an assignee notifies nobody."""
    if not assignee_id or assignee_id == actor_id:
        return []
    return [assignee_id]


def status_recipients(employee_id, assignee_id, actor_id):
    """A status change informs the owner and the assignee — never the actor."""
    ids = {employee_id}
    if assignee_id:
        ids.add(assignee_id)
    ids.discard(actor_id)
    return list(ids)


def reply_recipients(employee_id, assignee_id, author_id, author_role, agent_ids):
    """A reply informs the other party. Employee replies on still-unassigned
    tickets would otherwise reach nobody, so they fan out to agents."""
    ids = {employee_id}
    if assignee_id:
        ids.add(assignee_id)
    if assignee_id is None and author_role == "employee" and author_id == employee_id:
        ids.update(agent_ids)
    ids.discard(author_id)
    return list(ids)


def sla_threshold_hours(priority: str) -> int:
    return SLA_THRESHOLDS_HOURS.get(priority, SLA_THRESHOLDS_HOURS["default"])


# ---------------------------------------------------------------------------
# Message construction + emit
# ---------------------------------------------------------------------------

def _ticket_ids(ticket: dict) -> tuple:
    """Emit callers pass either a raw DB row (id=uuid, ref='TKT-n') or an
    already-serialized ticket (id='TKT-n', uuid=uuid). Return (ref, uuid)."""
    if "ref" in ticket:
        return ticket["ref"], ticket["id"]
    return ticket.get("id"), ticket.get("uuid")


def _message_for(event: str, ticket: dict, actor_name, payload: dict) -> str:
    ref = _ticket_ids(ticket)[0] or "the ticket"
    if event == EV_CREATED:
        return f"New {ticket['category']} ticket {ref} filed by {actor_name}"
    if event == EV_ASSIGNED:
        if actor_name is None:
            return f"{ref} was assigned to you"
        return f"{actor_name} assigned {ref} to you"
    if event == EV_STATUS:
        status = payload.get("status", "")
        if status in ("Resolved", "Closed"):
            return f"{ref} was {status.lower()} by {actor_name}"
        if status in ("Open", "In Progress"):
            return f"{ref} was reopened — now {status}"
        who = f" by {actor_name}" if actor_name else ""
        return f"{ref} status is now {status}{who}"
    if event == EV_REPLY:
        return f"{actor_name} replied on {ref}"
    if event == EV_SLA:
        hours = payload.get("thresholdHours", SLA_THRESHOLDS_HOURS["default"])
        return f"{ref} is still unassigned after {hours} hours"
    return f"Update on {ref}"


def build_row(recipient_id: str, ticket: dict, event: str, actor_name, payload: dict) -> dict:
    """One stored notification row. Content is deliberately shallow."""
    ref, ticket_uuid = _ticket_ids(ticket)
    return {
        "recipient_id": recipient_id,
        "ticket_id": ticket_uuid,
        "ticket_ref": ref,
        "type": event,
        "channel": "in_app",
        "actor_name": actor_name,
        "payload": payload,
        "message": _message_for(event, ticket, actor_name, payload),
        "read": False,
        "created_at": _now_iso(),
    }


def emit(ticket: dict, event: str, actor: dict | None, recipient_ids: list,
         payload: dict | None = None) -> int:
    """Persist notifications for one event. Raises on DB failure — callers
    that must never break a ticket action use safe_notify() instead."""
    actor_name = (actor or {}).get("name")
    full_payload = {"actorId": (actor or {}).get("id"), **(payload or {})}
    rows = [
        build_row(rid, ticket, event, actor_name, full_payload)
        for rid in sorted(set(filter(None, recipient_ids)))
    ]
    if not rows:
        return 0
    _rows(get_client().table("notifications").insert(rows).select("id"))
    return len(rows)


def safe_notify(ticket: dict, event: str, actor: dict | None, recipient_ids: list,
                payload: dict | None = None) -> None:
    """Fail-safe emit: a notification failure must never break a ticket action."""
    try:
        emit(ticket, event, actor, recipient_ids, payload)
    except Exception:
        log.exception("notification emit failed (event=%s ticket=%s)", event, ticket.get("ref"))


# ---------------------------------------------------------------------------
# Background jobs: first-response SLA sweep + retention cleanup
# ---------------------------------------------------------------------------

def agent_ids() -> list:
    rows = _rows(get_client().table("users").select("id").eq("role", "agent"))
    return [r["id"] for r in rows]


def _unassigned_tickets() -> list:
    out = []
    for status in ("Open", "In Progress"):
        out.extend(_rows(
            db().select("*").is_("assignee_id", None).eq("status", status)
        ))
    return out


def _sla_notified_at(ticket_uuid: str) -> set:
    prior = _rows(
        get_client().table("notifications")
        .select("payload")
        .eq("ticket_id", ticket_uuid)
        .eq("type", EV_SLA)
    )
    return {p.get("payload", {}).get("thresholdHours") for p in prior}


def _run_sla_sweep_inner() -> int:
    agents = agent_ids()
    now = now_utc()
    triggered = 0
    for row in _unassigned_tickets():
        threshold_h = sla_threshold_hours(row["priority"])
        created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        if now - created < timedelta(hours=threshold_h):
            continue
        if threshold_h in _sla_notified_at(row["id"]):
            continue
        safe_notify(row, EV_SLA, None, agents, payload={"thresholdHours": threshold_h})
        triggered += 1
    return triggered


def run_sla_sweep() -> int:
    """Notify every agent about unassigned tickets past their first-response
    SLA (Urgent: 4h, else 24h). Each ticket/threshold notifies at most once.
    A failing sweep only logs — background jobs must not crash the app."""
    try:
        return _run_sla_sweep_inner()
    except Exception:
        log.exception("SLA sweep failed")
        return 0


def run_retention_cleanup() -> int:
    """Delete read notifications older than 30 days and everything older than
    180 days. Returns the number of rows deleted; failures only log."""
    try:
        read_cutoff = (now_utc() - timedelta(days=RETENTION_READ_DAYS)).isoformat()
        any_cutoff = (now_utc() - timedelta(days=RETENTION_UNREAD_DAYS)).isoformat()
        notifications = get_client().table("notifications")

        doomed = set()
        for r in _rows(
            notifications.select("id").eq("read", True).lt("created_at", read_cutoff)
        ):
            doomed.add(r["id"])
        for r in _rows(notifications.select("id").lt("created_at", any_cutoff)):
            doomed.add(r["id"])

        deleted = 0
        for nid in doomed:
            notifications.delete().eq("id", nid).execute()
            deleted += 1
        return deleted
    except Exception:
        log.exception("retention cleanup failed")
        return 0
