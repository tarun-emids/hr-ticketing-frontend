// Thin REST client — the single place the UI talks to the FastAPI backend.
//
// Every function here returns plain JSON objects whose field names match the
// mock objects the screens were written against (employeeId, firstReplyAt,
// turns[{authorId, role, text, at}], …), because the backend sends camelCase.
//
// Base URL: override with VITE_API_URL in a .env at the project root if the
// backend runs somewhere else. Default assumes `uvicorn … --port 8000`.
// Auth: demo bearer token from POST /api/auth/login (no password) —
// persisted in localStorage so a page refresh keeps you signed in.

const BASE = String(
  import.meta.env?.VITE_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

const TOKEN_KEY = "hrdesk.token";
const USER_KEY = "hrdesk.user";

let token = null;
try {
  token = localStorage.getItem(TOKEN_KEY) ?? null;
} catch {
  token = null; // storage unavailable — behave like not signed in
}

export function getStoredCredentials() {
  let savedUser = null;
  try {
    savedUser = JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
  } catch {
    savedUser = null;
  }
  return { token, user: savedUser };
}

export function saveCredentials(nextToken, user) {
  token = nextToken;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function clearCredentials() {
  saveCredentials(null, null);
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail ?? `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Low-level fetch with error shaping; throws ApiError on any failure. */
async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      `Backend not reachable at ${BASE} — start it with:\n  cd backend && python -m uvicorn app.main:app --reload --port 8000`
    );
  }

  if (res.status === 401 && auth) {
    // expired/unknown session → drop local credentials; RequireAuth in
    // main.jsx renders via AuthContext, force an in-app redirect.
    clearCredentials();
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    throw new ApiError(401, "Session expired — sign in again.");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const payload = await res.json();
      if (typeof payload?.detail === "string") detail = payload.detail;
    } catch {
      /* non-JSON body — keep generic message */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// auth (Login.jsx + AuthContext.jsx)
// ---------------------------------------------------------------------------

export function fetchMeta() {
  // users, agents (HR only), categories, priorities, statuses in one payload
  return request("/api/meta");
}

export function listUsers(role) {
  const q = role ? `?role=${encodeURIComponent(role)}` : "";
  return request(`/api/auth/users${q}`);
}

export function login(userId) {
  return request("/api/auth/login", { method: "POST", body: { userId }, auth: false });
}

export function me() {
  return request("/api/auth/me", { auth: true });
}

export function logout() {
  // best-effort: always resolve, token is cleared locally regardless
  return request("/api/auth/logout", { method: "POST" }).catch(() => null);
}

// ---------------------------------------------------------------------------
// tickets
// ---------------------------------------------------------------------------

export function myTickets() {
  return request("/api/my-tickets");
}

export function inbox() {
  return request("/api/inbox");
}

export function createTicket(payload) {
  return request("/api/tickets", { method: "POST", body: payload });
}

export function getTicket(id) {
  return request(`/api/tickets/${encodeURIComponent(id)}`);
}

export function addReply(id, text) {
  return request(`/api/tickets/${encodeURIComponent(id)}/replies`, {
    method: "POST",
    body: { text },
  });
}

export function updateStatus(id, status) {
  return request(`/api/tickets/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function assignTicket(id, assigneeId) {
  return request(`/api/tickets/${encodeURIComponent(id)}/assignee`, {
    method: "PATCH",
    body: { assigneeId },
  });
}

export function setPriority(id, priority) {
  return request(`/api/tickets/${encodeURIComponent(id)}/priority`, {
    method: "PATCH",
    body: { priority },
  });
}

export function setCategory(id, category) {
  return request(`/api/tickets/${encodeURIComponent(id)}/category`, {
    method: "PATCH",
    body: { category },
  });
}

// ---------------------------------------------------------------------------
// HR dashboard
// ---------------------------------------------------------------------------

export function analytics() {
  return request("/api/analytics");
}
