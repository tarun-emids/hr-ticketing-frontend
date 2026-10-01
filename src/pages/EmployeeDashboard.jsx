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
      className="group block border border-surface-2 bg-surface p-4 transition-colors hover:border-teal/50 hover:bg-surface-2/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <span className="mono-label text-[10px] text-warm/35">{t.id}</span>
            <span className="text-caption text-warm/40">{timeAgo(t.updatedAt)}</span>
            {t.attachment && (
              <svg className="h-3 w-3 text-warm/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18.4 9.7-6.7 6.7a4 4 0 0 1-5.7-5.7l7.1-7.1a2.6 2.6 0 1 1 3.8 3.6l-6.5 6.5a1.4 1.4 0 0 1-2-2l5.9-6" />
              </svg>
            )}
          </div>
          <p className="truncate text-body-lg font-medium text-warm group-hover:text-teal-light">{t.subject}</p>
          <p className="mono-label mt-1 text-[10px] text-warm/40">{t.category}</p>
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
  // GET /api/my-tickets — backend already filters to the signed-in employee.
  const { tickets, loading, error } = useTickets("employee");
  const backendError = error?.status === 0;

  const mine = tickets.filter((t) => t.employeeId === user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <span className="mono-label mb-3 block text-[10px] text-teal">↘ 0 1 /  E M P L O Y E E</span>
        <div className="rule-teal mb-5" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-h3 text-warm">My tickets</h1>
            <p className="mt-1.5 text-caption text-warm/45">
              {loading
                ? "Loading your requests…"
                : mine.length === 1
                  ? "1 request"
                  : `${mine.length} requests · updates appear here automatically`}
            </p>
          </div>
          <Link
            to="/new-ticket"
            className="mono-label inline-flex items-center gap-2 border border-teal bg-teal px-4 py-2.5 text-[10px] text-canvas transition-colors hover:bg-teal-light"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New ticket
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="border border-surface-2 bg-surface"><SkeletonList rows={4} /></div>
      ) : backendError ? (
        <EmptyState
          title="Can't reach the backend"
          body="Start the API: cd backend && python -m uvicorn app.main:app --reload --port 8000 — this page fills in automatically once it answers."
          icon="▸"
        />
      ) : mine.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          body="When you raise a question with HR it will show up here with a live status so you never wonder where it stands."
          icon="↘"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {mine.map((t) => (
            <TicketRow key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
