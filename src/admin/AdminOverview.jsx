import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { adminOverview } from "./api";
import { Spinner, EmptyState, StatCard } from "../components/primitives";
import { CountBars, HistogramBars, RankedBars } from "./charts";
import { formatHrs } from "../utils";

const WINDOWS = [
  { key: "all", label: "ALL TIME" },
  { key: "24h", label: "24 HOURS" },
  { key: "7d", label: "1 WEEK" },
  { key: "30d", label: "1 MONTH" },
];

// Admin console — total ticket analytics (route /admin).
// Window switches re-query the backend (rows created inside the window).
// The AGENTS/TICKETS workspace drill lives on its own screen (/admin/worktable).
export default function AdminOverview() {
  const { user } = useAuth();
  const actorId = user?.id;
  const [window, setWindow] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminOverview(actorId, window)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [actorId, window]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label mb-2 text-[10px] text-teal">↘ A D M I N · C O N S O L E</p>
          <div className="rule-teal mb-4" />
          <h1 className="text-h3 text-warm">Ticket analytics</h1>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Window">
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              role="tab"
              aria-selected={window === w.key}
              onClick={() => setWindow(w.key)}
              className={`mono-label border px-3 py-1.5 text-[10px] transition-colors ${
                window === w.key
                  ? "border-teal bg-teal text-canvas"
                  : "border-warm/15 text-warm/50 hover:border-teal hover:text-teal"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <EmptyState icon="↘" title="Analytics unavailable" body={error} />
      ) : loading || !data ? (
        <Spinner label="Aggregating tickets" />
      ) : (
        <>
          {/* ---- KPI band: the requested open / assigned / closed counts ---- */}
          <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="OPEN" value={data.open} sub="Unpicked, fresh" tone="error" />
            <StatCard
              label="IN PROGRESS"
              value={data.inProgress + data.waitingOnEmployee}
              sub={`${data.inProgress} agent-side · ${data.waitingOnEmployee} waiting on employee`}
              tone="teal"
            />
            <StatCard
              label="RESOLVED"
              value={data.resolved}
              sub="To be re-opened or closed"
              tone="ok"
            />
            <StatCard label="CLOSED" value={data.closed} sub="Signed off" tone="ok" />
          </div>

          {/* ---- time metrics ---- */}
          <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              label="AVG FIRST RESPONSE"
              value={
                data.avgFirstResponseHrs == null
                  ? "—"
                  : formatHrs(data.avgFirstResponseHrs * 3_600_000)
              }
              sub={`${data.answeredShare}% of tickets answered`}
              tone="teal"
            />
            <StatCard
              label="MEDIAN F. RESPONSE"
              value={
                data.medianFirstResponseHrs == null
                  ? "—"
                  : formatHrs(data.medianFirstResponseHrs * 3_600_000)
              }
              sub="Half answered within"
              tone="teal"
            />
            <StatCard
              label="AVG TIME TO SOLVE"
              value={data.avgSolveHrs == null ? "—" : formatHrs(data.avgSolveHrs * 3_600_000)}
              sub="Creation → resolution"
              tone="teal"
            />
            <StatCard
              label="MEDIAN TIME TO SOLVE"
              value={data.medianSolveHrs == null ? "—" : formatHrs(data.medianSolveHrs * 3_600_000)}
              sub="Half resolved within"
              tone="teal"
            />
          </div>

          {/* ---- distributions ---- */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.responseDistribution?.length > 0 && (
              <section>
                <p className="mono-label mb-3 text-[10px] text-warm/40">
                  FIG. 01 · FIRST RESPONSE TIME
                </p>
                <div className="border border-surface-2 bg-surface p-4">
                  <HistogramBars data={data.responseDistribution} />
                </div>
              </section>
            )}
            {data.solveDistribution?.length > 0 && (
              <section>
                <p className="mono-label mb-3 text-[10px] text-warm/40">
                  FIG. 02 · TOTAL TIME TO SOLVE
                </p>
                <div className="border border-surface-2 bg-surface p-4">
                  <HistogramBars data={data.solveDistribution} />
                </div>
              </section>
            )}
          </div>

          {/* ---- status split bars ---- */}
          <section className="mb-8">
            <p className="mono-label mb-3 text-[10px] text-warm/40">FIG. 03 · STATUS SPLIT</p>
            <div className="border border-surface-2 bg-surface p-4">
              <CountBars
                data={[
                  { status: "Open", count: data.open },
                  { status: "In progress", count: data.inProgress },
                  { status: "Waiting on emp.", count: data.waitingOnEmployee },
                  { status: "Resolved", count: data.resolved },
                  { status: "Closed", count: data.closed },
                ]}
                xKey="status"
                yKey="count"
                height={180}
              />
            </div>
          </section>

          {/* ---- category load + repetitive subjects (the KB signal) ---- */}
          <section>
            <p className="mono-label mb-3 text-[10px] text-warm/40">
              FIG. 04 · WHERE THE TICKETS COME FROM (KB-improvement input on the Agents × Tickets
              screen)
            </p>
            <div className="border border-surface-2 bg-surface p-5">
              {data.categories?.length ? (
                <RankedBars rows={data.categories} labelKey="category" valueKey="total" />
              ) : (
                <p className="text-caption text-warm/40">No tickets in this window yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
