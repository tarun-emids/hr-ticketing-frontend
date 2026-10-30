// Admin console HTTP surface (src/admin) — one application, one file.
//
// Uses the shared client request pipeline so every call carries the trace/log
// plumbing. The BACKEND re-verifies the acting account's role on every call:
// actorId is the signed-in admin (resolved server-side against public.users);
// agents may request only their OWN metrics — the self-or-admin rule lives in
// app/admin/guards.py, never in this UI.
import { request } from "../api/client";

const withQuery = (path, params) => {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") usp.append(key, value);
  }
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
};

// ---- analytics (window: all|24h|7d|30d — tickets created inside it) -----------

export const adminOverview = (actorId, window = "all") =>
  request(withQuery("/admin/analytics/overview", { actorId, window }), {
    operation: "admin.overview",
  });

// Leaderboard for one period: top agents by resolved tickets.
export const agentLeaderboard = (actorId, period = "30d") =>
  request(withQuery("/admin/analytics/agents", { actorId, period }), {
    operation: "admin.leaderboard",
  });

// One agent's drill-down — the SAME payload an agent fetches for themselves
// (the HR dashboard's personal view), so no second component is needed.
export const agentMetrics = (actorId, agentId, period = "30d") =>
  request(withQuery(`/admin/metrics/agents/${encodeURIComponent(agentId)}`, { actorId, period }), {
    operation: "admin.agent.metrics",
  });

// ---- accounts ----------------------------------------------------------------

export const listAdminAccounts = (actorId) =>
  request(withQuery("/admin/accounts", { actorId }), { operation: "admin.accounts.list" });

export const createAdminAccount = (actorId, { name, email, role, password }) =>
  request(withQuery("/admin/accounts", { actorId }), {
    method: "POST",
    body: { name, email, role, password },
    operation: "admin.accounts.create",
  });

export const changeAccountRole = (actorId, accountId, role) =>
  request(withQuery(`/admin/accounts/${encodeURIComponent(accountId)}/role`, { actorId }), {
    method: "PATCH",
    body: { role },
    operation: "admin.accounts.role",
  });

export const deleteAdminAccount = (actorId, accountId) =>
  request(withQuery(`/admin/accounts/${encodeURIComponent(accountId)}`, { actorId }), {
    method: "DELETE",
    operation: "admin.accounts.delete",
  });

// ---- knowledge-base documents -------------------------------------------------

export const listAdminKbDocuments = (actorId) =>
  request(withQuery("/admin/kb/documents", { actorId }), { operation: "admin.kb.list" });

export const uploadAdminKbDocument = (actorId, file, meta) => {
  const form = new FormData();
  form.append("file", file);
  for (const [key, value] of Object.entries(meta)) form.append(key, value);
  return request(withQuery("/admin/kb/documents", { actorId }), {
    method: "POST",
    form,
    operation: "admin.kb.create",
  });
};

export const updateAdminKbDocument = (actorId, slug, { file, ...meta }) => {
  const form = new FormData();
  if (file) form.append("file", file);
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    form.append(key, value);
  }
  return request(withQuery(`/admin/kb/documents/${encodeURIComponent(slug)}`, { actorId }), {
    method: "PATCH",
    form,
    operation: "admin.kb.update",
  });
};

export const deleteAdminKbDocument = (actorId, slug) =>
  request(withQuery(`/admin/kb/documents/${encodeURIComponent(slug)}`, { actorId }), {
    method: "DELETE",
    operation: "admin.kb.delete",
  });
