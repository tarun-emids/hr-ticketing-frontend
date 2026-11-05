import { useAppSelector } from "../state/hooks";
import { selectUser, selectUsers } from "../state/authSlice";
import TicketTable from "../components/TicketTable";

export default function HRInbox() {
  const users = useAppSelector(selectUsers);
  const user = useAppSelector(selectUser);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-h3 text-warm">Tickets</h1>
        <p className="mt-1.5 text-caption text-ink-3">
          Every request from every employee — searchable, filterable, sortable.
        </p>
      </header>

      <TicketTable viewerId={user?.id} users={users} />
    </div>
  );
}
