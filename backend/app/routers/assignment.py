"""Assignment layer.

Manual assignment stays PATCH /api/tickets/{id}/assignee. This router adds the
"how" in routing terms:
  - GET  /api/agents/workload        → per-agent open/total ticket counts
  - POST /api/tickets/{id}/auto-assign → server picks the least-loaded agent
        (open count, then total as tiebreak) and runs the exact same assign
        flow as the manual picker (auto pickup reply, Open -> In Progress).

Pure counting — no AI, no scoring, fully inspectable.
"""
from fastapi import APIRouter, HTTPException

from app.config import db, get_client
from app.routers.tickets_actions import _assign
from app.routers.tickets_core import fetch_row, rows_of

router = APIRouter(tags=["assignment"])

# statuses that mean "still on their plate"
ACTIVE_STATUSES = ("Open", "In Progress", "Waiting on Employee")


def agent_workload() -> list[dict]:
    agents = rows_of(
        get_client().table("users").select("id,name,email")
        .eq("role", "agent").order("created_at")
    )
    # Single lightweight scan; aggregate in Python (v2: no .not_ chains needed).
    scanned = rows_of(db().select("assignee_id,status").limit(2000))
    counts: dict[str, list[int]] = {}  # id -> [open, total]
    for t in scanned:
        assignee = t.get("assignee_id")
        if not assignee:
            continue
        entry = counts.setdefault(assignee, [0, 0])
        entry[1] += 1
        if t["status"] in ACTIVE_STATUSES:
            entry[0] += 1

    return [
        {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "openCount": counts.get(u["id"], [0, 0])[0],
            "totalCount": counts.get(u["id"], [0, 0])[1],
        }
        for u in agents
    ]


@router.get("/agents/workload")
def workload():
    return agent_workload()


@router.post("/tickets/{tid}/auto-assign")
def auto_assign(tid: str):
    """Route a ticket to the least-loaded HR agent."""
    row = fetch_row(tid)
    if row["status"] in ("Resolved", "Closed"):
        raise HTTPException(
            status_code=409,
            detail=f"Ticket {row['ref']} is {row['status']}; reopen it before assigning.",
        )

    plate = agent_workload()
    if not plate:
        raise HTTPException(status_code=409, detail="No HR agents are configured yet.")

    pick = min(plate, key=lambda a: (a["openCount"], a["totalCount"]))
    ticket = _assign(row, pick["id"])
    return {
        **ticket,
        "routedTo": {"id": pick["id"], "name": pick["name"], "openCount": pick["openCount"]},
    }