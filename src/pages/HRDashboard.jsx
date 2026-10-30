import { IconArrowDownRight, IconUser } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import AgentMetricsView from "../admin/AgentMetricsView";

// HR dashboard — the AGENT'S OWN performance (route /hr-dashboard).
// Previously this page duplicated the org-wide totals; per product direction
// agents now see their personal metrics instead (the same numbers the admin
// sees in the drill-down, fetched for themselves — the backend's
// self-or-admin rule blocks agents from reading anybody else's numbers).
export default function HRDashboard() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal-deep">
          <IconArrowDownRight size={16} aria-hidden />
          02 / MY PERFORMANCE
        </span>
        <div className="rule-teal mb-5" />
        <h1 className="flex items-center gap-3 text-h3 text-warm">
          <IconUser size={18} aria-hidden />
          {user?.name || "My performance"}
        </h1>
        <p className="mt-1.5 text-caption text-warm/45">
          Your accepted, completed and pending tickets — with your response and solve-time charts.
        </p>
      </header>
      <AgentMetricsView agentId={user?.id} agentName={user?.name} selfMode />
    </div>
  );
}
