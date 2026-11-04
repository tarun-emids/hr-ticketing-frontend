import { useEffect } from "react";
import { IconArrowDownRight } from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { fetchTickets, selectAllTickets, selectTicketsLoading } from "../state/ticketsSlice";
import { selectUser, selectUsers } from "../state/authSlice";
import TicketTable from "../components/TicketTable";
import { SkeletonList, EmptyState } from "../components/primitives";

// MY TICKETS — the HR agent's own backlog (route /assigned-to-me): only the
// tickets whose assignee is this agent. The all-tickets view stays on
// /inbox; a filter by name or the status column narrows further there.
export default function AgentMyTickets() {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectUsers);
  const user = useAppSelector(selectUser);
  const tickets = useAppSelector(selectAllTickets);
  const loading = useAppSelector(selectTicketsLoading);
  const mine = tickets.filter((t) => t.assigneeId === user.id);

  useEffect(() => {
    dispatch(fetchTickets());
  }, [dispatch]);

  const openMine = mine.filter((t) => !["Resolved", "Closed"].includes(t.status));

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-h3 text-warm">My tickets</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          {mine.length === 0
            ? "Nothing assigned to you yet — newly assigned tickets land here."
            : `${mine.length} assigned to you · ${openMine.length} still open`}
        </p>
      </header>

      {loading ? (
        <div className="border border-surface-2 bg-surface">
          <SkeletonList rows={6} />
        </div>
      ) : mine.length === 0 ? (
        <EmptyState
          icon="↘"
          title="Nothing is assigned to you yet"
          body="Take a ticket from the Tickets screen — or tickets flow to you when someone is assigned."
        />
      ) : (
        <TicketTable tickets={mine} users={users} />
      )}
    </div>
  );
}
