import { useEffect, useState } from "react";
import { IconArrowDownRight } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { agentWorkload } from "../api/client";
import TicketTable from "../components/TicketTable";

// MY TICKETS — the HR agent's own backlog (route /assigned-to-me): a pinned
// assignee filter on the server. Stats come from the workload API (per-agent
// open/total), matching the numbers the assignment screen shows.
export default function AgentMyTickets() {
  const { users, user } = useAuth();
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
        <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal-deep">
          <IconArrowDownRight size={16} aria-hidden />
          02 / MY TICKETS
        </span>
        <div className="rule-teal mb-5" />
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
