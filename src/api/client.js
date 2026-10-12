// Thin HTTP client over the HR Desk FastAPI backend.
// Base URL can be overridden with VITE_API_URL (see vite .env), e.g.
//   VITE_API_URL=http://localhost:8000/api
//
// Tracing & correlation:
// - every request carries a W3C `traceparent` header and an `X-Request-ID`
//   correlation id; the backend validates and echoes the id, stamps every
//   backend log record with it, and Jaeger shows the trace.
// - the trace context is REAL OpenTelemetry: a span per operation via
//   @opentelemetry/sdk-trace-web (src/api/trace.js) — ids are never
//   fabricated here; the W3C propagator injects the traceparent from the
//   span's own context. Spans are not exported (context only, no egress).
// - lifecycle events (start / succeeded / failed) of the same operation are
//   POSTed to /api/logs/ingest with the SAME correlation id AND the
//   operation's trace/span ids, so frontend and backend entries for one user
//   action land in backend/logs/app.log together under one id pair
//   (backend logging utility: src/api/logger.js; ID model: backend README §11).
// - every API call also carries an `operation` label (e.g. "tickets.create")
//   in its events, so frontend events can be filtered by business operation
//   exactly like the backend's hrdesk.flow events.
// - VITE_TRACE=false disables the span + traceparent header entirely;
//   VITE_LOGS=false disables the remote event sink (backend keeps its own
//   logs either way); the console correlation line always stays.
import { logEvent, newCorrelationId } from "./logger";
import {
  endRequestSpan,
  injectTraceHeaders,
  startRequestSpan,
  traceContextFields,
} from "./trace";

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

const logsEnabled = () => import.meta.env.VITE_LOGS !== "false";
const isLogRoute = (path) => path.startsWith("/logs");

function logRequest(method, path, status, durationMs, traceId, requestId) {
  const req = requestId ? ` req=${requestId}` : "";
  const line = `${method} ${path} -> ${status} in ${durationMs}ms trace=${traceId}${req}`;
  if (status >= 400) console.warn(line);
  else console.debug(line);
}

async function request(path, { method = "GET", body, form, operation } = {}) {
  const correlationId = newCorrelationId();
  const startedAt = performance.now();
  const endpoint = path.split("?")[0]; // path only — query strings are never logged
  const logEndpoint = logsEnabled() && !isLogRoute(path); // no recursion via our own sink

  // Real OTel span per operation (VITE_TRACE=false -> null everywhere below).
  const spanEntry = startRequestSpan(method, endpoint);
  const traceFields = traceContextFields(spanEntry);

  if (logEndpoint) {
    logEvent("http_request_start", {
      correlationId,
      method,
      endpoint,
      operation,
      ...traceFields,
    });
  }

  const headers = {
    ...(form ? {} : { "Content-Type": "application/json" }),
    "X-Request-ID": correlationId, // validated server-side; reused as request_id in every backend line
  };
  injectTraceHeaders(headers, spanEntry); // adds `traceparent` when tracing is on

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (err) {
    endRequestSpan(spanEntry, { error: err });
    const durationMs = Math.round(performance.now() - startedAt);
    const traceId = traceFields.traceId || "";
    logRequest(method, path, "network error", durationMs, traceId, "");
    if (logEndpoint) {
      logEvent("http_request_network_error", {
        level: "ERROR",
        correlationId,
        method,
        endpoint,
        operation,
        durationMs,
        ...traceFields,
      });
    }
    throw err;
  }

  const durationMs = Math.round(performance.now() - startedAt);
  const requestId = res.headers.get("x-request-id") || "";
  const traceId = traceFields.traceId || "";
  if (!res.ok) {
    endRequestSpan(spanEntry, { statusCode: res.status, error: new Error(res.statusText) });
    logRequest(method, path, res.status, durationMs, traceId, requestId);
    if (logEndpoint) {
      logEvent(res.status >= 500 ? "http_request_server_error" : "http_request_client_error", {
        level: res.status >= 500 ? "ERROR" : "WARNING",
        correlationId,
        method,
        endpoint,
        operation,
        statusCode: res.status,
        durationMs,
        ...traceFields,
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
  endRequestSpan(spanEntry, { statusCode: res.status });
  logRequest(method, path, res.status, durationMs, traceId, requestId);
  if (logEndpoint) {
    logEvent("http_request_succeeded", {
      correlationId,
      method,
      endpoint,
      operation,
      statusCode: res.status,
      durationMs,
      ...traceFields,
    });
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---- auth -------------------------------------------------------------------
// Credentials are verified server-side against Supabase Auth; the backend
// returns the matching public.users row. No secrets cross the wire either way.
export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password }, operation: "auth.login" }); // { user: {id,name,email,role} }

// ---- users ----------------------------------------------------------------
export const listUsers = () => request("/users", { operation: "users.list" });

// ---- tickets ----------------------------------------------------------------
export const listTickets = () => request("/tickets", { operation: "tickets.list" });
export const getTicket = (id) =>
  request(`/tickets/${encodeURIComponent(id)}`, { operation: "tickets.get" });
export const createTicket = (body) =>
  request("/tickets", { method: "POST", body, operation: "tickets.create" });
export const addReply = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/replies`, {
    method: "POST",
    body,
    operation: "tickets.reply",
  });
export const updateStatus = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body,
    operation: "tickets.status",
  });
export const assignTicket = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/assignee`, {
    method: "PATCH",
    body,
    operation: "tickets.assign",
  });
export const setPriority = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/priority`, {
    method: "PATCH",
    body,
    operation: "tickets.priority",
  });
export const setCategory = (id, body) =>
  request(`/tickets/${encodeURIComponent(id)}/category`, {
    method: "PATCH",
    body,
    operation: "tickets.category",
  });

// ---- ticket drafts ----------------------------------------------------------
const withEmployee = (path, employeeId) =>
  `${path}?employeeId=${encodeURIComponent(employeeId)}`;
export const listDrafts = (employeeId) =>
  request(withEmployee("/drafts", employeeId), { operation: "drafts.list" }); // employeeId rides the query — never logged
export const getDraft = (id, employeeId) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}`, employeeId), { operation: "drafts.get" });
export const createDraft = (body) =>
  request("/drafts", { method: "POST", body, operation: "drafts.create" });
export const updateDraft = (id, employeeId, body) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}`, employeeId), {
    method: "PATCH",
    body,
    operation: "drafts.update",
  });
export const deleteDraft = (id, employeeId) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}`, employeeId), {
    method: "DELETE",
    operation: "drafts.delete",
  });
export const submitDraft = (id, body) =>
  request(`/drafts/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    body,
    operation: "drafts.submit",
  });
export const uploadDraftAttachment = (id, employeeId, file) => {
  const form = new FormData();
  form.append("file", file);
  return request(withEmployee(`/drafts/${encodeURIComponent(id)}/attachment`, employeeId), {
    method: "POST",
    form,
    operation: "drafts.attachment.upload",
  });
};
export const deleteDraftAttachment = (id, employeeId) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}/attachment`, employeeId), {
    method: "DELETE",
    operation: "drafts.attachment.delete",
  });
export const getDraftAttachmentUrl = (id, employeeId) =>
  request(withEmployee(`/drafts/${encodeURIComponent(id)}/attachment`, employeeId), {
    operation: "drafts.attachment.url",
  });

// ---- assignment -------------------------------------------------------------
export const agentWorkload = () =>
  request("/agents/workload", { operation: "agents.workload" }); // [{id,name,email,openCount,totalCount}]
export const autoAssignTicket = (id) =>
  request(`/tickets/${encodeURIComponent(id)}/auto-assign`, {
    method: "POST",
    operation: "tickets.auto_assign",
  });

// ---- notifications ----------------------------------------------------------
const withQuery = (path, params) => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null) usp.append(k, v);
  }
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
};
export const listNotifications = (params) =>
  request(withQuery("/notifications", params), { operation: "notifications.list" });
export const unreadCount = (userId) =>
  request(withQuery("/notifications/unread-count", { userId }), {
    operation: "notifications.unread_count",
  }); // { unread }
export const markNotificationRead = (id, userId) =>
  request(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    body: { userId },
    operation: "notifications.mark_read",
  });
export const markAllNotificationsRead = (userId) =>
  request("/notifications/read-all", {
    method: "POST",
    body: { userId },
    operation: "notifications.mark_all_read",
  }); // { updated }

// ---- attachments ------------------------------------------------------------
export const uploadAttachment = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return request(`/tickets/${encodeURIComponent(id)}/attachment`, {
    method: "POST",
    form,
    operation: "attachment.upload",
  });
};
export const getAttachmentUrl = (id) =>
  request(`/tickets/${encodeURIComponent(id)}/attachment`, {
    operation: "attachment.url",
  }); // { name, size, url, expiresInSeconds }
