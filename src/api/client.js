// Thin HTTP client over the HR Desk FastAPI backend.
// Base URL can be overridden with VITE_API_URL (see vite .env), e.g.
//   VITE_API_URL=http://localhost:8000/api
//
// Tracing & correlation:
// - every request carries a W3C `traceparent` header (fresh trace) and an
//   `X-Request-ID` correlation id; the backend validates and echoes the id,
//   stamps every backend log record with it, and Jaeger shows the trace.
// - lifecycle events (start / succeeded / failed) of the same operation are
//   POSTed to /api/logs/ingest with the SAME correlation id, so frontend and
//   backend entries for one user action land in backend/logs/app.log
//   together (backend logging utility: src/api/logger.js).
// - VITE_TRACE=false disables the traceparent header; VITE_LOGS=false
//   disables the remote event sink (backend keeps its own logs either way);
//   the console correlation line always stays for debugging.
import { logEvent, newCorrelationId } from "./logger";

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

const traceEnabled = () => import.meta.env.VITE_TRACE !== "false";
const logsEnabled = () => import.meta.env.VITE_LOGS !== "false";
const isLogRoute = (path) => path.startsWith("/logs");

function randomHex(byteCount) {
  const buffer = new Uint8Array(byteCount);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
}

// W3C version format: 00-<trace-id 32 hex nonzero>-<span-id 16 hex>-01
function makeTraceparent() {
  let traceId;
  do {
    traceId = randomHex(16);
  } while (!Number.parseInt(traceId.slice(0, 8), 16));
  const spanId = randomHex(8);
  return `00-${traceId}-${spanId}-01`;
}

function logRequest(method, path, status, durationMs, traceId, requestId) {
  const req = requestId ? ` req=${requestId}` : "";
  const line = `${method} ${path} -> ${status} in ${durationMs}ms trace=${traceId}${req}`;
  if (status >= 400) console.warn(line);
  else console.debug(line);
}

async function request(path, { method = "GET", body, form } = {}) {
  const tracing = traceEnabled();
  const traceparent = tracing ? makeTraceparent() : null;
  const traceId = tracing ? traceparent.slice(3, 35) : "";
  const correlationId = newCorrelationId();
  const startedAt = performance.now();
  const endpoint = path.split("?")[0];
  const logEndpoint = logsEnabled() && !isLogRoute(path); // no recursion via our own sink

  if (logEndpoint) {
    logEvent("http_request_start", {
      correlationId,
      method,
      endpoint,
    });
  }

  const baseHeaders = form ? undefined : { "Content-Type": "application/json" };
  const headers = {
    ...(baseHeaders || {}),
    ...(traceparent ? { traceparent } : {}),
    // validated server-side; reused as request_id in every backend line
    "X-Request-ID": correlationId,
  };

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - startedAt);
    logRequest(method, path, "network error", durationMs, traceId, "");
    if (logEndpoint) {
      logEvent("http_request_network_error", {
        level: "ERROR",
        correlationId,
        method,
        endpoint,
        durationMs,
      });
    }
    throw err;
  }

  const durationMs = Math.round(performance.now() - startedAt);
  const requestId = res.headers.get("x-request-id") || "";
  if (!res.ok) {
    logRequest(method, path, res.status, durationMs, traceId, requestId);
    if (logEndpoint) {
      logEvent(res.status >= 500 ? "http_request_server_error" : "http_request_client_error", {
        level: res.status >= 500 ? "ERROR" : "WARNING",
        correlationId,
        method,
        endpoint,
        statusCode: res.status,
        durationMs,
      });
    }
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      /* non-JSON error body — fall back to status text */
    }
    throw new Error(detailFrom(res, payload));
  }
  logRequest(method, path, res.status, durationMs, traceId, requestId);
  if (logEndpoint) {
    logEvent("http_request_succeeded", {
      correlationId,
      method,
      endpoint,
      statusCode: res.status,
      durationMs,
    });
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
