import { IconArrowDownRight } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import TicketTable from "../components/TicketTable";

export default function HRInbox() {
  const { users, user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal-deep">
          <IconArrowDownRight size={16} aria-hidden />
          01 / TICKETS
        </span>
        <div className="rule-teal mb-5" />
        <h1 className="text-h3 text-warm">Tickets</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          Every request from every employee — searchable, filterable, sortable.
        </p>
      </header>

      <TicketTable viewerId={user?.id} users={users} />
    </div>
  );
}
