import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks";
import { StatusBadge, PriorityBadge } from "../components/Badge";
import { SkeletonList, EmptyState } from "../components/primitives";
import { timeAgo } from "../utils";

function TicketRow({ t }) {
  return (
    <Link
      to={`/tickets/${t.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-accent-300 hover:bg-accent-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">{t.id}</span>
            <span className="text-[11px] text-slate-300">·</span>
            <span className="text-[11px] text-slate-400">{timeAgo(t.updatedAt)}</span>
            {t.attachment && (
              <svg className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.4 9.7-6.7 6.7a4 4 0 0 1-5.7-5.7l7.1-7.1a2.6 2.6 0 1 1 3.8 3.6l-6.5 6.5a1.4 1.4 0 0 1-2-2l5.9-6" />
              </svg>
            )}
          </div>
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-accent-700">{t.subject}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{t.category}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
        </div>
      </div>
    </Link>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { tickets, loading } = useTickets();

  const mine = tickets.filter((t) => t.employeeId === user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My tickets</h1>
          <p className="text-sm text-slate-500">
            {loading ? "Loading your requests…" : mine.length === 0 ? "" : `${mine.length} ticket${mine.length === 1 ? "" : "s"} · updates appear here automatically`}
          </p>
        </div>
        <Link to="/new-ticket" className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New ticket
        </Link>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white"><SkeletonList rows={4} /></div>
      ) : mine.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          body="When you raise a question with HR it will show up here with a live status so you never wonder where it stands."
          icon="📨"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {mine.map((t) => (
            <TicketRow key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
