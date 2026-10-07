// Thin HTTP client over the HR Desk FastAPI backend.
// Base URL can be overridden with VITE_API_URL (see vite .env), e.g.
//   VITE_API_URL=http://localhost:8000/api
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");

function detailFrom(res, body) {
  if (body?.detail) {
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((d) => d?.msg ?? String(d)).join("; ");
    }
    return JSON.stringify(body.detail);
  }
  return `${res.status} ${res.statusText}`;
}

async function request(path, { method = "GET", body, form } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: form ? undefined : { "Content-Type": "application/json" },
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON error body — fall back to status text */
    }
    throw new Error(detailFrom(res, payload));
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---- auth -------------------------------------------------------------------
// Credentials are verified server-side against Supabase Auth; the backend
// returns the matching public.users row. No secrets cross the wire either way.
export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password } }); // { user: {id,name,email,role} }

// ---- users ----------------------------------------------------------------
export const listUsers = () => request("/users");

// ---- tickets ----------------------------------------------------------------
export const listTickets = () => request("/tickets");
export const getTicket = (id) => request(`/tickets/${encodeURIComponent(id)}`);
export const createTicket = (body) => request("/tickets", { method: "POST", body });
export const addReply = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/replies`, { method: "POST", body });
export const updateStatus = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/status`, { method: "PATCH", body });
export const assignTicket = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/assignee`, { method: "PATCH", body });
export const setPriority = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/priority`, { method: "PATCH", body });
export const setCategory = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/category`, { method: "PATCH", body });

// ---- ticket drafts ----------------------------------------------------------
const withEmployee = (path, employeeId) =>
  `${path}?employeeId=${encodeURIComponent(employeeId)}`;
export const listDrafts = (employeeId) =>
  request(withEmployee("/drafts", employeeId));
export const getDraft = (id, employeeId) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}`, employeeId));
export const createDraft = (body) => request("/drafts", { method: "POST", body });
export const updateDraft = (id, employeeId, body) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}`, employeeId), { method: "PATCH", body });
export const deleteDraft = (id, employeeId) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}`, employeeId), { method: "DELETE" });
export const submitDraft = (id, body) =>
  request(`/drafts/${encodeURIComponent(id)}/submit`, { method: "POST", body });
export const uploadDraftAttachment = (id, employeeId, file) => {
  const form = new FormData();
  form.append("file", file);
  return request(withEmployee(`/drafts/${encodeURIComponent(id)}/attachment`, employeeId), {
    method: "POST",
    form,
  });
};
export const deleteDraftAttachment = (id, employeeId) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}/attachment`, employeeId), { method: "DELETE" });
export const getDraftAttachmentUrl = (id, employeeId) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}/attachment`, employeeId));

// ---- assignment -------------------------------------------------------------
export const agentWorkload = () => request("/agents/workload"); // [{id,name,email,openCount,totalCount}]
export const autoAssignTicket = (id) =>
  request(`/tickets/${encodeURIComponent(id)}/auto-assign`, { method: "POST" });

// ---- notifications ----------------------------------------------------------
const withQuery = (path, params) => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null) usp.append(k, v);
  }
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
};
export const listNotifications = (params) => request(withQuery("/notifications", params));
export const unreadCount = (userId) =>
  request(withQuery("/notifications/unread-count", { userId })); // { unread }
export const markNotificationRead = (id, userId) =>
  request(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST", body: { userId } });
export const markAllNotificationsRead = (userId) =>
  request("/notifications/read-all", { method: "POST", body: { userId } }); // { updated }

// ---- attachments ------------------------------------------------------------
export const uploadAttachment = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return request(`/tickets/${encodeURIComponent(id)}/attachment`, { method: "POST", form });
};
export const getAttachmentUrl = (id) =>
  request(`/tickets/${encodeURIComponent(id)}/attachment`); // { name, size, url, expiresInSeconds }
