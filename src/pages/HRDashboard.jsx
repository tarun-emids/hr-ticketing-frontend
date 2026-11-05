import { useAppSelector } from "../state/hooks";
import { selectUser } from "../state/authSlice";
import AgentMetricsView from "../admin/AgentMetricsView";
import { PageBanner } from "../components/primitives";
import chartsImg from "../assets/charts-blue.jpg";

// HR dashboard — the AGENT'S OWN performance (route /hr-dashboard).
// Previously this page duplicated the org-wide totals; per product direction
// agents now see their personal metrics instead (the same numbers the admin
// sees in the drill-down, fetched for themselves — the backend's
// self-or-admin rule blocks agents from reading anybody else's numbers).
export default function HRDashboard() {
  const user = useAppSelector(selectUser);
  return (
    <div className="mx-auto max-w-4xl">
      <PageBanner
        image={chartsImg}
        position="70% 40%"
        title="My performance"
        sub="Your accepted, completed and pending tickets — with your response and solve-time charts."
      />
      <AgentMetricsView agentId={user?.id} agentName={user?.name} selfMode />
    </div>
  );
}
