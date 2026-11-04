import { IconArrowDownRight, IconUser } from "@tabler/icons-react";
import { useAppSelector } from "../state/hooks";
import { selectUser } from "../state/authSlice";
import AgentMetricsView from "../admin/AgentMetricsView";

// HR dashboard — the AGENT'S OWN performance (route /hr-dashboard).
// Previously this page duplicated the org-wide totals; per product direction
// agents now see their personal metrics instead (the same numbers the admin
// sees in the drill-down, fetched for themselves — the backend's
// self-or-admin rule blocks agents from reading anybody else's numbers).
export default function HRDashboard() {
  const user = useAppSelector(selectUser);
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
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
