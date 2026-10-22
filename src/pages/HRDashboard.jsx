import { useMemo } from "react";
import { IconArrowDownRight } from "@tabler/icons-react";
import { STATUSES, CATEGORIES } from "../data/users";
import { useTickets } from "../hooks";
import { StatCard, Spinner, EmptyState } from "../components/primitives";
import { formatHrs } from "../utils";

/* One accent in data: all bars Emids Teal, no gradient (charts never get one). */
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
        <h1 className="mb-8 text-h3 text-warm">HR dashboard</h1>
        <EmptyState
          title="No data to chart yet"
          body="Once tickets flow in, status counts, category load and response-time stats appear here."
          icon={<IconArrowDownRight size={32} />}
        />
      </div>
    );
  }

  const activePairs = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...activePairs.map(([, n]) => n));
  const alerted = tickets.filter((t) => !t.firstReplyAt && !["Resolved", "Closed"].includes(t.status)).length;
  const replied = tickets.filter((t) => t.firstReplyAt).length;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-10">
        <span className="mono-label mb-3 flex items-center gap-2 text-[10px] text-teal-deep">
          <IconArrowDownRight size={16} aria-hidden />
          02 / OVERSIGHT
        </span>
        <div className="rule-teal mb-5" />
        <h1 className="text-h3 text-warm">HR dashboard</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          {stats.total} tickets tracked · {stats.active} still being worked on · {stats.byStatus.Closed} closed.
        </p>
      </header>

      <section aria-label="Counts by status" className="mb-10">
        <p className="mono-label mb-4 text-[10px] text-warm/40">FIG. 01 · COUNTS BY STATUS</p>
        {/* Brand grid: subdivide 2/3/4/6, never 5 — the Closed count moves to the header meta line. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {STATUSES.filter((s) => s !== "Closed").map((s) => (
            <StatCard
              key={s}
              label={s}
              value={stats.byStatus[s]}
              tone={
                s === "Waiting on Employee" ? "accent"
                : s === "Resolved" ? "ok"
                : s === "In Progress" ? "teal"
                : s === "Open" ? "teal"
                : "warm"
              }
            />
          ))}
        </div>
      </section>

      <section aria-label="Open tickets by category" className="mb-10">
        <p className="mono-label mb-4 text-[10px] text-warm/40">FIG. 02 · OPEN TICKETS BY CATEGORY</p>
        <div className="soft-bl border border-surface-2 bg-surface p-6">
          <ul className="flex flex-col gap-4">
            {activePairs.map(([cat, n]) => {
              const isTop = n === activePairs[0][1] && n > 0;
              return (
                <li key={cat} className="grid grid-cols-[110px_1fr_40px] items-center gap-4 text-body">
                  <span className="truncate font-medium text-warm/75">{cat}</span>
                  <div className="h-2.5 bg-surface-2">
                    <div
                      className={`h-full ${isTop ? "bg-teal" : "bg-teal/40"}`}
                      style={{ width: `${(n / maxCat) * 100}%` }}
                    />
                  </div>
                  <span className="text-right font-mono tabular-nums text-warm">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-label="Average response time">
        <p className="mono-label mb-4 text-[10px] text-warm/40">FIG. 03 · RESPONSE PERFORMANCE</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            label="AVG FIRST RESPONSE"
            value={stats.avgHrs == null ? "—" : formatHrs(stats.avgHrs)}
            sub={stats.avgHrs == null ? "No agent replies yet" : "Across all replied tickets"}
            tone="teal"
          />
          <StatCard label="NO REPLY YET" value={alerted} sub="Active tickets unanswered" tone="error" />
          <StatCard label="FIRST REPLIES MADE" value={`${replied}/${tickets.length}`} sub="Tickets answered" tone="ok" />
        </div>
      </section>
    </div>
  );
}
