import { useEffect, useState } from "react";
import * as api from "../api";
import { StatCard, Spinner, EmptyState } from "../components/primitives";
import { formatHrs } from "../utils";

/* One accent in data: all bars Emids Teal, no gradient (charts never get one). */
export default function HRDashboard() {
  // GET /api/analytics — server computes: counts by status, active tickets
  // by category, response performance (same numbers the old client-side
  // useMemo crunched from the mock store, now from the real DB).
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .analytics()
        .then((d) => {
          if (alive) {
            setStats(d);
            setError(null);
          }
        })
        .catch((e) => {
          if (alive) setError(e);
        });
    load();
    const timer = setInterval(load, 6000); // re-render when tickets change
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (!stats) {
    if (error?.status === 0) {
      return (
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-h3 text-warm">HR dashboard</h1>
          <EmptyState
            title="Can't reach the backend"
            body="Start the API: cd backend && python -m uvicorn app.main:app --reload --port 8000 — the figures fill in automatically once it answers."
            icon="▸"
          />
        </div>
      );
    }
    if (error) {
      return (
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-h3 text-warm">HR dashboard</h1>
          <EmptyState title="Something went wrong" body={error.message} icon="▸" />
        </div>
      );
    }
    return <Spinner />;
  }

  if (stats.total === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-h3 text-warm">HR dashboard</h1>
        <EmptyState
          title="No data to chart yet"
          body="Once tickets flow in, status counts, category load and response-time stats appear here."
          icon="↘"
        />
      </div>
    );
  }

  const byStatus = Object.entries(stats.byStatus);
  const activePairs = Object.entries(stats.activeByCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...activePairs.map(([, n]) => n));
  const avgHrsMs =
    stats.response.avgFirstResponseHours == null
      ? null
      : stats.response.avgFirstResponseHours * 3_600_000; // util expects ms

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-10">
        <span className="mono-label mb-3 block text-[10px] text-teal">↘ 0 2 /  O V E R S I G H T</span>
        <div className="rule-teal mb-5" />
        <h1 className="text-h3 text-warm">HR dashboard</h1>
        <p className="mt-1.5 text-caption text-warm/45">
          {stats.total} tickets tracked · {stats.active} still being worked on.
        </p>
      </header>

      <section aria-label="Counts by status" className="mb-10">
        <p className="mono-label mb-4 text-[10px] text-warm/40">FIG. 01 · COUNTS BY STATUS</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {byStatus.map(([s, n]) => (
            <StatCard
              key={s}
              label={s}
              value={n}
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
                      className={`h-full ${isTop ? "bg-teal" : "bg-teal/50"}`}
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
            value={avgHrsMs == null ? "—" : formatHrs(avgHrsMs)}
            sub={avgHrsMs == null ? "No agent replies yet" : "Across all replied tickets"}
            tone="teal"
          />
          <StatCard
            label="NO REPLY YET"
            value={stats.response.noReplyYet}
            sub="Active tickets unanswered"
            tone="error"
          />
          <StatCard
            label="FIRST REPLIES MADE"
            value={`${stats.response.replied}/${stats.response.total}`}
            sub="Tickets answered"
            tone="ok"
          />
        </div>
      </section>
    </div>
  );
}
