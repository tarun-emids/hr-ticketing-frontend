import { useEffect } from "react";
import { IconArrowDownRight } from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { fetchTickets, selectAllTickets, selectTicketsLoading } from "../state/ticketsSlice";
import { selectUsers } from "../state/authSlice";
import TicketTable from "../components/TicketTable";
import { SkeletonList, EmptyState } from "../components/primitives";

export default function HRInbox() {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectUsers);
  const tickets = useAppSelector(selectAllTickets);
  const loading = useAppSelector(selectTicketsLoading);

  useEffect(() => {
    dispatch(fetchTickets());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-h3 text-warm">Tickets</h1>
        </header>
        <div className="border border-surface-2 bg-surface">
          <SkeletonList rows={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-h3 text-warm">Tickets</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          Every request from every employee — searchable, filterable, sortable.
        </p>
      </header>

      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          body="When employees raise tickets they will appear here. This usually means nobody has used the service yet — try submitting a demo ticket."
          icon={<IconArrowDownRight size={32} />}
        />
      ) : (
        <TicketTable tickets={tickets} users={users} />
      )}
    </div>
  );
}
