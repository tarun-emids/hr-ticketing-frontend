import { useTickets, useMeta } from "../hooks";
import { USERS } from "../data/users";
import TicketTable from "../components/TicketTable";
import { SkeletonList, EmptyState } from "../components/primitives";

export default function HRInbox() {
  // GET /api/inbox — agent-only endpoint (401/403 would mean the token/role
  // is wrong; the RequireAuth wrapper already prevents that).
  const { tickets, loading, error } = useTickets("agent");
  const meta = useMeta();
  const users = meta?.users ?? USERS;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-h3 text-warm">All tickets</h1>
        </header>
        <div className="border border-surface-2 bg-surface"><SkeletonList rows={6} /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <span className="mono-label mb-3 block text-[10px] text-teal">↘ 0 1 /  I N B O X</span>
        <div className="rule-teal mb-5" />
        <h1 className="text-h3 text-warm">All tickets</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          Every request from every employee — searchable, filterable, sortable.
        </p>
      </header>

      {error && error.status === 0 ? (
        <EmptyState
          title="Can't reach the backend"
          body="Start the API: cd backend && python -m uvicorn app.main:app --reload --port 8000 — the inbox refreshes automatically once it answers."
          icon="▸"
        />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="The inbox is empty"
          body="When employees raise tickets they will appear here. This usually means nobody has used the service yet — try submitting a demo ticket."
          icon="↘"
        />
      ) : (
        <TicketTable tickets={tickets} users={users} />
      )}
    </div>
  );
}
