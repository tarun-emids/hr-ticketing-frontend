"""Employee ticket drafts and their optional attachments."""
import os
import uuid as uuidlib

from fastapi import APIRouter, HTTPException, UploadFile

from app.config import (
    ATTACHMENT_BUCKET,
    MAX_ATTACHMENT_BYTES,
    SIGNED_URL_TTL,
    SUPABASE_URL,
    get_client,
)
from app.models import DraftCreate, DraftSubmit, DraftUpdate, draft_out, ticket_out
from app.notifications import EV_CREATED, agent_ids, created_recipients, safe_notify
from app.routers.tickets_core import get_user, rows_of, run

router = APIRouter(prefix="/drafts", tags=["drafts"])


def _table():
    return get_client().table("ticket_drafts")


def fetch_draft(draft_id: str, employee_id: str) -> dict:
    rows = rows_of(
        _table()
        .select("*")
        .eq("id", draft_id)
        .eq("employee_id", employee_id)
        .limit(1)
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Draft not found")
    return rows[0]


def _verify_employee(employee_id: str) -> dict:
    employee = get_user(employee_id)
    if not employee or employee["role"] != "employee":
        raise HTTPException(status_code=422, detail="employeeId must belong to a known employee")
    return employee


def _remove_attachment(path: str) -> None:
    try:
        get_client().storage.from_(ATTACHMENT_BUCKET).remove([path])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not remove draft attachment: {e}")


@router.get("")
def list_drafts(employeeId: str):
    """GET /drafts?employeeId=... — drafts belonging to one employee."""
    _verify_employee(employeeId)
    rows = rows_of(
        _table()
        .select("*")
        .eq("employee_id", employeeId)
        .order("updated_at", desc=True)
    )
    return [draft_out(row) for row in rows]


@router.post("", status_code=201)
def create_draft(payload: DraftCreate):
    """POST /drafts — save an incomplete ticket form."""
    _verify_employee(payload.employee_id)
    saved = rows_of(
        _table()
        .insert({
            "employee_id": payload.employee_id,
            "category": payload.category,
            "subject": payload.subject.strip(),
            "description": payload.description.strip(),
            "priority": payload.priority,
        })
        .select("*")
    )
    return draft_out(saved[0])


@router.get("/{draft_id}")
def get_draft(draft_id: str, employeeId: str):
    return draft_out(fetch_draft(draft_id, employeeId))


@router.patch("/{draft_id}")
def update_draft(draft_id: str, employeeId: str, payload: DraftUpdate):
    row = fetch_draft(draft_id, employeeId)
    patch = payload.model_dump(exclude_unset=True, exclude_none=True)
    for field in ("subject", "description"):
        if field in patch:
            patch[field] = patch[field].strip()
    if patch:
        run(_table().update(patch).eq("id", row["id"]))
    return draft_out(fetch_draft(draft_id, employeeId))


@router.delete("/{draft_id}", status_code=204)
def delete_draft(draft_id: str, employeeId: str):
    row = fetch_draft(draft_id, employeeId)
    if row.get("attachment_path"):
        _remove_attachment(row["attachment_path"])
    run(_table().delete().eq("id", row["id"]))


@router.post("/{draft_id}/submit")
def submit_draft(draft_id: str, payload: DraftSubmit):
    """Validate and convert the saved draft into a normal ticket."""
    draft = fetch_draft(draft_id, payload.employee_id)
    employee = _verify_employee(payload.employee_id)
    subject = draft["subject"].strip()
    description = draft["description"].strip()
    if len(subject) < 5:
        raise HTTPException(status_code=422, detail="Subject needs at least 5 characters.")
    if len(description) < 20:
        raise HTTPException(status_code=422, detail="Description needs at least 20 characters.")

    created = rows_of(
        get_client().table("tickets")
        .insert({
            "employee_id": payload.employee_id,
            "category": draft["category"],
            "subject": subject,
            "description": description,
            "priority": draft["priority"],
            "status": "Open",
            "attachment_path": draft.get("attachment_path"),
            "attachment_name": draft.get("attachment_name"),
            "attachment_size": draft.get("attachment_size"),
        })
        .select("*")
    )
    ticket = created[0]
    run(_table().delete().eq("id", draft["id"]))
    safe_notify(ticket, EV_CREATED, employee, created_recipients(agent_ids()))
    return ticket_out(ticket, [])


@router.post("/{draft_id}/attachment")
def upload_draft_attachment(draft_id: str, employeeId: str, file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=422, detail="No file provided")
    draft = fetch_draft(draft_id, employeeId)
    data = file.file.read()
    if len(data) > MAX_ATTACHMENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is larger than {MAX_ATTACHMENT_BYTES // (1024 * 1024)} MB",
        )

    ext = os.path.splitext(file.filename)[1][:16] or ".bin"
    path = f"drafts/{draft_id}/{uuidlib.uuid4().hex}{ext}"
    storage = get_client().storage.from_(ATTACHMENT_BUCKET)
    try:
        storage.upload(
            path,
            data,
            {"contentType": file.content_type or "application/octet-stream", "upsert": "false"},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")

    run(
        _table()
        .update({
            "attachment_path": path,
            "attachment_name": file.filename,
            "attachment_size": len(data),
        })
        .eq("id", draft["id"])
    )
    if draft.get("attachment_path"):
        _remove_attachment(draft["attachment_path"])
    return draft_out(fetch_draft(draft_id, employeeId))


@router.delete("/{draft_id}/attachment", status_code=204)
def delete_draft_attachment(draft_id: str, employeeId: str):
    draft = fetch_draft(draft_id, employeeId)
    if draft.get("attachment_path"):
        _remove_attachment(draft["attachment_path"])
        run(
            _table()
            .update({
                "attachment_path": None,
                "attachment_name": None,
                "attachment_size": None,
            })
            .eq("id", draft["id"])
        )


@router.get("/{draft_id}/attachment")
def draft_attachment_url(draft_id: str, employeeId: str, ttl: int = SIGNED_URL_TTL):
    draft = fetch_draft(draft_id, employeeId)
    if not draft.get("attachment_path"):
        raise HTTPException(status_code=404, detail="Draft has no attachment")
    try:
        result = get_client().storage.from_(ATTACHMENT_BUCKET).create_signed_url(
            draft["attachment_path"], max(60, min(ttl, 86400))
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not sign URL: {e}")

    url = result.get("signedURL") or result.get("signedUrl") or ""
    if url and not url.startswith("http"):
        url = f"{SUPABASE_URL}/storage/v1{url}"
    return {
        "name": draft.get("attachment_name"),
        "size": draft.get("attachment_size"),
        "url": url,
        "expiresInSeconds": SIGNED_URL_TTL,
    }
