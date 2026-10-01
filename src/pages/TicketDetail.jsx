import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { USERS, HR_AGENTS, CATEGORIES, PRIORITIES, STATUSES } from "../data/users";
import { useTicket, useMeta } from "../hooks";
import * as api from "../api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, PriorityBadge } from "../components/Badge";
import Thread from "../components/Thread";
import { Spinner, EmptyState } from "../components/primitives";
import { formatDateTime, timeAgo } from "../utils";

const SELECT =
  "w-full border border-surface-2 bg-canvas px-2.5 py-2 text-body text-warm focus:border-teal focus:outline-none";

function MetaItem({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="mono-label text-[10px] text-warm/40">{label}</p>
      <div className="mt-1.5 text-body-lg text-warm/85">{children}</div>
    </div>
  );
}

function AgentControls({ ticket, onUpdated }) {
  // Each control PATCHes the backend; the response is the refreshed ticket.
  const apply = (fn) => async (value) => {
    try {
      onUpdated(await fn(ticket.id, value));
    } catch (e) {
      alert(e.message); // demo-friendly surface for 422s ("Assignee must be an HR agent.")
    }
  };

  return (
    <div className="mt-6 grid gap-5 border-t border-surface-2 pt-6 sm:grid-cols-2">
      <MetaItem label="Status">
        <select
          value={ticket.status}
          onChange={(e) => apply(api.updateStatus)(e.target.value)}
          className={SELECT}
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </MetaItem>
      <MetaItem label="Assignee">
        <select
          value={ticket.assigneeId ?? ""}
          onChange={(e) => apply(api.assignTicket)(e.target.value || null)}
          className={SELECT}
        >
          <option value="">Unassigned</option>
          {HR_AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </MetaItem>
      <MetaItem label="Priority">
        <select
          value={ticket.priority}
          onChange={(e) => apply(api.setPriority)(e.target.value)}
          className={SELECT}
        >
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </MetaItem>
      <MetaItem label="Re-categorise">
        <select
          value={ticket.category}
          onChange={(e) => apply(api.setCategory)(e.target.value)}
          className={SELECT}
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
  const [banner, setBanner] = useState(justCreated);

  // GET /api/tickets/{id} (+ quiet polling so the other role's activity shows up)
  const { ticket, notFound, denied, error, setTicket } = useTicket(id);
  const meta = useMeta();

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(false), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  if (!ticket) {
    // Casual 401s (expired token) are already handled by the API layer
    // (single sign-in redirect), so no dedicated case is needed here.
    if (error?.status === 0) {
      return (
        <div className="mx-auto max-w-4xl pt-8">
          <EmptyState
            title="Can't reach the backend"
            body="Start the API: cd backend && python -m uvicorn app.main:app --reload --port 8000"
            icon="▸"
          />
        </div>
      );
    }
    if (notFound) {
      return (
        <div className="mx-auto max-w-4xl pt-8">
          <EmptyState title={`Ticket ${id} not found`} body="It may have been removed, or the link is wrong." icon="↘" />
        </div>
      );
    }
    if (denied) {
      return (
        <div className="mx-auto max-w-4xl pt-8">
          <EmptyState title="No access to this ticket" body="You can only view your own tickets." icon="▸" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="mx-auto max-w-4xl pt-8">
          <EmptyState title="Something went wrong" body={error.message} icon="▸" />
        </div>
      );
    }
    return <Spinner />;
  }

  const users = meta?.users ?? USERS;
  const isAgent = user.role === "agent";
  const isMine = ticket.employeeId === user.id;
  if (!isAgent && !isMine) {
    return (
      <div className="mx-auto max-w-4xl pt-8">
        <EmptyState title="No access to this ticket" body="You can only view your own tickets." icon="▸" />
      </div>
    );
  }

  const employee = users.find((u) => u.id === ticket.employeeId);
  const assignee = users.find((u) => u.id === ticket.assigneeId);
  const closedBy = users.find((u) => u.id === ticket.closedBy);

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => navigate(isAgent ? "/inbox" : "/my-tickets")}
        className="mono-label inline-flex items-center gap-2 text-[10px] text-warm/45 transition-colors hover:text-teal"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to {isAgent ? "inbox" : "my tickets"}
      </button>

      {banner && (
        <div className="mt-4 flex items-center gap-2 border border-ok/40 bg-ok/10 px-4 py-3 text-body-lg text-ok">
          <span aria-hidden>▸</span> Ticket {ticket.id} submitted — HR has been notified.
        </div>
      )}

      <header className="mt-6 mb-6">
        <span className="mono-label mb-3 block text-[10px] text-teal">↘ T I C K E T</span>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="mono-label text-[10px] text-warm/40">{ticket.id}</span>
          <StatusBadge status={ticket.status} size="md" />
          <PriorityBadge priority={ticket.priority} size="md" />
        </div>
        <h1 className="text-h3 text-warm sm:text-h2 sm:leading-[0.85]">{ticket.subject}</h1>
        <p className="mt-2 text-caption text-warm/50">
          {employee?.name} · {employee?.email} · opened {timeAgo(ticket.createdAt)}
        </p>
      </header>

      <section className="soft-bl mb-8 border border-surface-2 bg-surface-2/40 p-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          <MetaItem label="Category">{ticket.category}</MetaItem>
          <MetaItem label="Opened">{formatDateTime(ticket.createdAt)}</MetaItem>
          <MetaItem label="Last update">{timeAgo(ticket.updatedAt)}</MetaItem>
          <MetaItem label="Assignee">
            {assignee ? assignee.name : <span className="text-warm/25 italic">Unassigned</span>}
          </MetaItem>
          <MetaItem label="Resolved">
            {ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : <span className="text-warm/25">—</span>}
          </MetaItem>
          <MetaItem label="Closed by">
            {closedBy ? closedBy.name : <span className="text-warm/25">—</span>}
          </MetaItem>
        </div>

        {ticket.attachment && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border border-surface-2 bg-canvas px-3 py-2.5 text-body text-warm/80">
            <svg className="h-3.5 w-3.5 text-teal/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18.4 9.7-6.7 6.7a4 4 0 0 1-5.7-5.7l7.1-7.1a2.6 2.6 0 1 1 3.8 3.6l-6.5 6.5a1.4 1.4 0 0 1-2-2l5.9-6" />
            </svg>
            {ticket.attachment.name}
            <span className="mono-label text-[10px] text-warm/35">{(ticket.attachment.size / 1024).toFixed(0)} KB</span>
          </div>
        )}

        {isAgent && (
          <AgentControls
            ticket={ticket}
            onUpdated={(fresh) => setTicket(fresh)}
          />
        )}
      </section>

      <p className="mono-label mb-4 text-[10px] text-warm/40">CONVERSATION / FIG. {ticket.id.replace("-", ".")}</p>
      <Thread
        ticket={ticket}
        users={users}
        viewer={user}
        onSend={async (text) => {
          try {
            setTicket(await api.addReply(ticket.id, text));
          } catch (e) {
            alert(e.message);
          }
        }}
      />
    </div>
  );
}
