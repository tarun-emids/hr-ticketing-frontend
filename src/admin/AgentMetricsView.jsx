import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentMetrics } from "./api";
import { Spinner, EmptyState } from "../components/primitives";
import { CountBars, DualCountLines, HistogramBars, RankedBars, TimeLines } from "./charts";
import { formatHrs } from "../utils";

const PERIODS = [
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "1 week" },
  { key: "30d", label: "1 month" },
];

// Agent performance view (src/admin) — ONE component, two doors:
//
//   • the AGENT's personal dashboard (agentId == signed-in id, which the
//     backend's self-or-admin rule allows)  — "my performance"
//   • the ADMIN's drill-down from the leaderboard (any agent)
//
// Period basis (server-defined, printed under the stats): accepted/pending =
// tickets assigned and created inside the window; completed = resolved inside
// the window; response/solve = first-reply / resolution durations.
export default function AgentMetricsView({ agentId, agentName, selfMode = false, peers = null }) {
  const { user } = useAuth();
  const actorId = user?.id;
  const [period, setPeriod] = useState("7d");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    agentMetrics(actorId, agentId, period)
      .then((m) => {
        if (alive) setMetrics(m);
      })
      .catch((e) => {
        if (alive) setError(e.message || "Could not load performance metrics.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [actorId, agentId, period]);

  return (
    <div>
      {/* period switch (24h / 1 week / 1 month) */}
      <div className="mb-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={period === p.key}
            onClick={() => setPeriod(p.key)}
            className={`mono-label border px-3 py-1.5 text-[10px] transition-colors ${
              period === p.key
                ? "border-teal bg-teal text-canvas"
                : "border-warm/15 text-warm/50 hover:border-teal hover:text-teal"
            }`}
          >
            {p.label.toUpperCase()}
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState icon="↘" title="Metrics unavailable" body={error} />
      ) : loading || !metrics ? (
        <Spinner label="Crunching the numbers" />
      ) : (
        <>
          {/* the five counters */}
          <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label="ACCEPTED"
              value={metrics.accepted}
              sub="Assigned · created in window"
              tone="teal"
            />
            <Stat label="COMPLETED" value={metrics.completed} sub="Resolved in window" tone="ok" />
            <Stat label="PENDING" value={metrics.pending} sub="Still open" tone="warm" />
            <Stat
              label="AVG SOLVE"
              value={metrics.avgSolveHrs == null ? "—" : formatHrs(metrics.avgSolveHrs * 3_600_000)}
              sub={
                metrics.fastestSolveHrs == null
                  ? "No completions yet"
                  : `Fastest ${formatHrs(metrics.fastestSolveHrs * 3_600_000)}`
              }
              tone="teal"
            />
            <Stat
              label="AVG FIRST REPLY"
              value={
                metrics.avgFirstResponseHrs == null
                  ? "—"
                  : formatHrs(metrics.avgFirstResponseHrs * 3_600_000)
              }
              sub={
                metrics.fastestFirstResponseHrs == null
                  ? "No replies yet"
                  : `Fastest ${formatHrs(metrics.fastestFirstResponseHrs * 3_600_000)}`
              }
              tone="teal"
            />
            <Stat
              label="MEDIAN REPLY"
              value={
                metrics.medianFirstResponseHrs == null
                  ? "—"
                  : formatHrs(metrics.medianFirstResponseHrs * 3_600_000)
              }
              sub="Half answered within"
              tone="teal"
            />
            <Stat
              label="MEDIAN SOLVE"
              value={
                metrics.medianSolveHrs == null ? "—" : formatHrs(metrics.medianSolveHrs * 3_600_000)
              }
              sub="Half completed within"
              tone="teal"
            />
            <Stat
              label="SLA COMPLIANCE"
              value={metrics.slaComplianceRate == null ? "—" : `${metrics.slaComplianceRate}%`}
              sub={`${metrics.slaWithinTarget ?? 0} / ${metrics.slaWindowCompletions ?? 0} completions in target`}
              tone="ok"
            />
            <Stat
              label="PERF. SCORE"
              value={metrics.score == null ? "—" : `${metrics.score}/100`}
              sub="SLA · response · throughput"
              tone="teal"
            />
          </div>

          {/* created vs resolved across the window */}
          {metrics.series?.length > 0 && (
            <section className="mb-8">
              <p className="mono-label mb-3 text-[10px] text-warm/40">
                FIG. 01 · CREATED VS RESOLVED ({period.toUpperCase()})
              </p>
              <div className="border border-surface-2 bg-surface p-4">
                <DualCountLines
                  data={metrics.series}
                  lines={[
                    { key: "created", label: "Created" },
                    { key: "resolved", label: "Resolved" },
                  ]}
                  yLabel="tickets"
                  xLabel={period === "24h" ? "hour of day" : "day (ends at)"}
                />
              </div>
            </section>
          )}

          {/* response + solve HOURS per bucket — how quickly work moves */}
          {metrics.series?.some((b) => b.avgResponseHrs != null || b.avgSolveHrs != null) && (
            <section className="mb-8">
              <p className="mono-label mb-3 text-[10px] text-warm/40">
                FIG. 02 · RESPONSE &amp; SOLVE SPEED PER {period === "24h" ? "HOUR" : "DAY"} (
                {period.toUpperCase()})
              </p>
              <div className="border border-surface-2 bg-surface p-4">
                <TimeLines
                  data={metrics.series}
                  series={[
                    { key: "avgResponseHrs", label: "avg first response (h)", color: "#abc7ca" },
                    { key: "avgSolveHrs", label: "avg time to solve (h)", color: "#47a2b0" },
                  ]}
                  yLabel="hours"
                  xLabel={period === "24h" ? "hour of day" : "day (ends at)"}
                />
              </div>
            </section>
          )}

          {/* workload by current status of the pending side */}
          {metrics.workload?.length > 0 && (
            <section className="mb-8">
              <p className="mono-label mb-3 text-[10px] text-warm/40">
                FIG. 03 · WORKLOAD · THE PENDING SIDE BY CURRENT STATUS
              </p>
              <div className="border border-surface-2 bg-surface p-4">
                <CountBars
                  data={metrics.workload}
                  xKey="status"
                  yKey="count"
                  height={160}
                  yLabel="open tickets"
                  xLabel="current status"
                />
              </div>
            </section>
          )}

          {/* what the agent solves, by category */}
          {metrics.categories?.length > 0 && (
            <section className="mb-8">
              <p className="mono-label mb-3 text-[10px] text-warm/40">
                FIG. 04 · RESOLUTIONS BY CATEGORY (COMPLETED IN WINDOW)
              </p>
              <div className="border border-surface-2 bg-surface p-5">
                <RankedBars rows={metrics.categories} labelKey="category" valueKey="resolved" />
              </div>
            </section>
          )}

          {/* peer comparison (admin drill-down only — passes leaderboard rows) */}
          {peers?.length > 1 && (
            <section className="mb-8">
              <p className="mono-label mb-3 text-[10px] text-warm/40">
                FIG. 05 · TEAM SCORE COMPARISON ({period.toUpperCase()})
              </p>
              <div className="border border-surface-2 bg-surface p-5">
                <RankedBars rows={peers} labelKey="name" valueKey="score" />
              </div>
            </section>
          )}

          {/* response + solve distributions */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {metrics.responseDistribution?.length > 0 && (
              <section>
                <p className="mono-label mb-3 text-[10px] text-warm/40">
                  FIG. 06 · FIRST RESPONSE TIME
                </p>
                <div className="border border-surface-2 bg-surface p-4">
                  <HistogramBars
                    data={metrics.responseDistribution}
                    xLabel="tickets"
                    yLabel="answered within"
                  />
                </div>
              </section>
            )}
            {metrics.solveDistribution?.length > 0 && (
              <section>
                <p className="mono-label mb-3 text-[10px] text-warm/40">
                  FIG. 07 · TOTAL TIME TO RESOLVE
                </p>
                <div className="border border-surface-2 bg-surface p-4">
                  <HistogramBars
                    data={metrics.solveDistribution}
                    xLabel="tickets"
                    yLabel="solved within"
                  />
                </div>
              </section>
            )}
          </div>

          <p className="mt-6 text-caption text-warm/30">
            {selfMode
              ? "Your own numbers — nothing here is visible to other agents."
              : `Metrics for ${agentName || "this agent"}`}{" "}
            · basis: accepted/pending = assigned tickets created in the window, completed = tickets
            resolved in the window.
          </p>
        </>
      )}
    </div>
  );
}

// Local minimal stat card (primitives.StatCard has the same visual, but the
// metrics grid wants tighter sub-captions + the same tone ids).
function Stat({ label, value, sub, tone = "warm" }) {
  const toneClass =
    tone === "ok"
      ? "text-ok"
      : tone === "error"
        ? "text-error"
        : tone === "teal"
          ? "text-teal-light"
          : "text-warm";
  return (
    <div className="soft-bl border border-surface-2 bg-surface p-4">
      <p className="mono-label text-[9px] text-warm/40">{label}</p>
      <p className={`mt-1.5 font-mono text-[20px] leading-none ${toneClass}`}>{value}</p>
      <p className="mt-1.5 text-[10px] text-warm/35">{sub}</p>
    </div>
  );
}
