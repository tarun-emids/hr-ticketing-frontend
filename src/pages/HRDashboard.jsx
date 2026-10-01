import { useMemo } from "react";
import { STATUSES, CATEGORIES } from "../data/users";
import { useTickets } from "../hooks";
import { StatCard, Spinner, EmptyState } from "../components/primitives";
import { StatusBadge } from "../components/Badge";
import { formatHrs } from "../utils";

const CAT_TONES = [
  "bg-accent-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-violet-500",
];

export default function HRDashboard() {
  const { tickets, loading } = useTickets();

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    tickets.forEach((t) => { if (byStatus[t.status] !== undefined) byStatus[t.status] += 1; });

    const active = tickets.filter((t) => !["Resolved", "Closed"].includes(t.status));
    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    active.forEach((t) => { if (byCategory[t.category] !== undefined) byCategory[t.category] += 1; });

    const responseTimes = tickets
      .filter((t) => t.firstReplyAt)
      .map((t) => Date.parse(t.firstReplyAt) - Date.parse(t.createdAt));
    const avgHrs = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    return { byStatus, byCategory, avgHrs, active: active.length, total: tickets.length };
  }, [tickets]);

  if (loading) return <Spinner />;

  if (tickets.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-xl font-bold text-slate-900">HR dashboard</h1>
        <EmptyState
          title="No data to chart yet"
          body="Once tickets flow in, status counts, category load and response-time stats appear here."
          icon="📊"
        />
      </div>
    );
  }

  const activePairs = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...activePairs.map(([, n]) => n));

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">HR dashboard</h1>
        <p className="text-sm text-slate-500">{stats.total} tickets tracked · {stats.active} still being worked on.</p>
      </header>

      <section aria-label="Counts by status" className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Counts by status</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STATUSES.map((s) => (
            <StatCard
              key={s}
              label={s}
              value={stats.byStatus[s]}
              tone={
                s === "Waiting on Employee" ? "warn" :
                s === "Resolved" ? "good" :
                s === "In Progress" ? "accent" : "slate"
              }
            />
          ))}
        </div>
      </section>

      <section aria-label="Open tickets by category" className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Open tickets by category</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ul className="flex flex-col gap-3.5">
            {activePairs.map(([cat, n], i) => (
              <li key={cat} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm">
                <span className="truncate font-medium text-slate-700">{cat}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${CAT_TONES[i % CAT_TONES.length]}`}
                    style={{ width: `${(n / maxCat) * 100}%` }}
                  />
                </div>
                <span className="text-right tabular-nums text-slate-600">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="Average response time">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Response performance</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Avg first response"
            value={stats.avgHrs == null ? "—" : formatHrs(stats.avgHrs)}
            sub={stats.avgHrs == null ? "No agent replies yet" : "Across all replied tickets"}
            tone="accent"
          />
          <StatCard label="Tickets without reply" value={tickets.filter((t) => !t.firstReplyAt && !["Resolved", "Closed"].includes(t.status)).length} tone="bad" />
          <StatCard label="First replies made" value={`${tickets.filter((t) => t.firstReplyAt).length}/${tickets.length}`} sub="Tickets answered" tone="good" />
        </div>
      </section>
    </div>
  );
}
