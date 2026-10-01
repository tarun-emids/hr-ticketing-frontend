import { USERS } from "../data/users";
import { useTickets } from "../hooks";
import TicketTable from "../components/TicketTable";
import { SkeletonList, EmptyState } from "../components/primitives";

export default function HRInbox() {
  const { tickets, loading } = useTickets();

  const openCount = tickets.filter((t) => ["Open", "In Progress"].includes(t.status)).length;
  const urgent = tickets.filter((t) => t.priority === "Urgent" && !["Resolved", "Closed"].includes(t.status)).length;
  const unassigned = tickets.filter((t) => !t.assigneeId).length;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">All tickets</h1>
        </header>
        <div className="rounded-xl border border-slate-200 bg-white"><SkeletonList rows={6} /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">All tickets</h1>
          <p className="text-sm text-slate-500">Every request from every employee, searchable and filterable.</p>
        </div>
      </header>

      {tickets.length === 0 ? (
        <EmptyState
          title="The inbox is empty"
          body="When employees raise tickets they will appear here. This usually means nobody has used the service yet — try submitting a demo ticket."
          icon="📭"
        />
      ) : (
        <TicketTable tickets={tickets} users={USERS} />
      )}
    </div>
  );
}
