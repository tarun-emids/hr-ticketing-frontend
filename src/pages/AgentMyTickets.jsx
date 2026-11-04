import { useEffect, useState } from "react";
import { agentWorkload } from "../api/client";
import { useAppSelector } from "../state/hooks";
import { selectUser, selectUsers } from "../state/authSlice";
import TicketTable from "../components/TicketTable";

// MY TICKETS — the HR agent's own backlog (route /assigned-to-me): a pinned
// assignee filter on the server. Stats come from the workload API (per-agent
// open/total), matching the numbers the assignment screen shows.
export default function AgentMyTickets() {
  const users = useAppSelector(selectUsers);
  const user = useAppSelector(selectUser);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user?.id) return undefined;
    let alive = true;
    agentWorkload(user.id)
      .then((rows) => {
        if (alive) {
          setStats(rows.find((w) => w.id === user.id) ?? { openCount: 0, totalCount: 0 });
        }
      })
      .catch(() => {
        if (alive) setStats({ openCount: 0, totalCount: 0 });
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8">
        <h1 className="text-h3 text-warm">My tickets</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          {!stats
            ? "Loading your backlog…"
            : stats.totalCount === 0
              ? "Nothing assigned to you yet — newly assigned tickets land here."
              : `${stats.totalCount} assigned to you · ${stats.openCount} still open`}
        </p>
      </header>

      <TicketTable viewerId={user?.id} users={users} fixedAssignee={user?.id} />
    </div>
  );
}
