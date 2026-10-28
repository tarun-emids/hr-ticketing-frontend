import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AgentMetricsView from "./AgentMetricsView";
import { Icon, PATHS } from "../components/icons";

// Admin drill-down — one agent's full performance (route /admin/agents/:id),
// opened from the leaderboard. The metrics block is the same AgentMetricsView
// the agents use on their personal dashboard; the admin just gets a name
// header and the back link.
export default function AdminAgentDrilldown() {
  const { user } = useAuth();
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);

  useEffect(() => {
    let alive = true;
    import("./api").then(({ listAdminAccounts }) =>
      listAdminAccounts(user.id).then((rows) => {
        if (alive) setAgent(rows.find((r) => r.id === agentId) || null);
      }),
    );
    return () => {
      alive = false;
    };
  }, [user.id, agentId]);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/admin/worktable"
        className="mono-label mb-6 inline-flex items-center gap-2 text-[10px] text-warm/45 transition-colors hover:text-teal"
      >
        <Icon d={PATHS.arrowLeft} className="h-3.5 w-3.5" />
        Back to the worktable
      </Link>

      <header className="mb-8">
        <span className="mono-label mb-2 block text-[10px] text-teal">
          ↘ A G E N T · P E R F O R M A N C E
        </span>
        <div className="rule-teal mb-4" />
        <h1 className="text-h3 text-warm">{agent ? agent.name : "Agent"}</h1>
        {agent && <p className="mono-label mt-1 text-[9px] text-warm/35">{agent.email}</p>}
      </header>

      <AgentMetricsView agentId={agentId} agentName={agent?.name} />
    </div>
  );
}
