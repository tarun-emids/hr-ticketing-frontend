import { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { USERS, HR_AGENTS, CATEGORIES, PRIORITIES, STATUSES } from "../data/users";
import { getTicket, subscribe, updateStatus, assignTicket, setPriority, setCategory } from "../data/store";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, PriorityBadge } from "../components/Badge";
import Thread from "../components/Thread";
import { Spinner, EmptyState } from "../components/primitives";
import { formatDateTime, timeAgo } from "../utils";

function MetaItem({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function AgentControls({ ticket, actor }) {
  return (
    <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <MetaItem label="Status">
        <select
          value={ticket.status}
          onChange={(e) => updateStatus(ticket.id, e.target.value, actor.id)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none"
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </MetaItem>
      <MetaItem label="Assignee">
        <select
          value={ticket.assigneeId ?? ""}
          onChange={(e) => assignTicket(ticket.id, e.target.value || null)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none"
        >
          <option value="">Unassigned</option>
          {HR_AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </MetaItem>
      <MetaItem label="Priority">
        <select
          value={ticket.priority}
          onChange={(e) => setPriority(ticket.id, e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none"
        >
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </MetaItem>
      <MetaItem label="Re-categorise">
        <select
          value={ticket.category}
          onChange={(e) => setCategory(ticket.id, e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </MetaItem>
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justCreated = searchParams.get("created") === "1";
  const [, force] = useState(0);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(justCreated);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    const unsub = subscribe(() => force((n) => n + 1));
    return () => { clearTimeout(t); unsub(); };
  }, [id]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(false), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  const ticket = getTicket(id);

  if (loading) return <Spinner />;

  if (!ticket) {
    return (
      <EmptyState
        title={`Ticket ${id} not found`}
        body="It may have been removed, or the link is wrong."
        icon="🔍"
      />
    );
  }

  const isMine = ticket.employeeId === user.id;
  const isAgent = user.role === "agent";
  if (!isAgent && !isMine) {
    return (
      <EmptyState
        title="No access to this ticket"
        body="You can only view your own tickets."
        icon="🔒"
      />
    );
  }

  const employee = USERS.find((u) => u.id === ticket.employeeId);
  const assignee = USERS.find((u) => u.id === ticket.assigneeId);
  const backTo = isAgent ? "/inbox" : "/my-tickets";

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => navigate(backTo)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to {isAgent ? "inbox" : "my tickets"}
      </button>

      {banner && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          🎉 Ticket {ticket.id} submitted — HR has been notified.
        </div>
      )}

      <header className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">{ticket.id}</span>
          <StatusBadge status={ticket.status} size="md" />
          <PriorityBadge priority={ticket.priority} size="md" />
        </div>
        <h1 className="text-xl font-bold leading-snug text-slate-900">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {employee?.name} · {employee?.email} · opened {timeAgo(ticket.createdAt)}
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MetaItem label="Category">{ticket.category}</MetaItem>
          <MetaItem label="Opened">{formatDateTime(ticket.createdAt)}</MetaItem>
          <MetaItem label="Last update">{timeAgo(ticket.updatedAt)}</MetaItem>
          <MetaItem label="Assignee">
            {assignee ? (
              <span className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-100 text-[10px] font-semibold text-accent-700">
                  {assignee.name.split(" ").map((p) => p[0]).join("")}
                </span>
                {assignee.name}
              </span>
            ) : <span className="italic text-slate-300">Unassigned</span>}
          </MetaItem>
          <MetaItem label="Resolved">
            {ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : <span className="text-slate-400">—</span>}
          </MetaItem>
          <MetaItem label="Closed by">
            {ticket.closedBy
              ? USERS.find((u) => u.id === ticket.closedBy)?.name
              : <span className="text-slate-400">—</span>}
          </MetaItem>
        </div>

        {ticket.attachment && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.4 9.7-6.7 6.7a4 4 0 0 1-5.7-5.7l7.1-7.1a2.6 2.6 0 1 1 3.8 3.6l-6.5 6.5a1.4 1.4 0 0 1-2-2l5.9-6" />
            </svg>
            {ticket.attachment.name}
            <span className="text-xs text-slate-400">({(ticket.attachment.size / 1024).toFixed(0)} KB)</span>
          </div>
        )}

        {isAgent && <AgentControls ticket={ticket} actor={user} />}
      </section>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Conversation</h2>
      <Thread ticket={ticket} users={USERS} viewer={user} />
    </div>
  );
}
