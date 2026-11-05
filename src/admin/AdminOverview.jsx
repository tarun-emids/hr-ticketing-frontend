import { useEffect, useState } from "react";
import { useAppSelector } from "../state/hooks";
import { selectUser } from "../state/authSlice";
import { adminOverview } from "./api";
import { Spinner, EmptyState, StatCard, PageBanner } from "../components/primitives";
import { CountBars, Heatmap, HistogramBars, RankedBars, TimeLines } from "./charts";
import { formatHrs } from "../utils";
import chartsImg from "../assets/charts-blue.jpg";

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
  const user = useAppSelector(selectUser);
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
      <PageBanner image={chartsImg} position="75% 45%" title="Ticket analytics">
        <div className="mt-4 flex justify-end gap-2" role="tablist" aria-label="Window">
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              role="tab"
              aria-selected={window === w.key}
              onClick={() => setWindow(w.key)}
              className={`mono-label border px-3 py-1.5 text-[10px] transition-colors ${
                window === w.key
                  ? "border-teal bg-teal text-canvas"
                  : "border-warm/15 text-ink-3 hover:border-teal hover:text-teal"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </PageBanner>

      {error ? (
        <EmptyState icon="↘" title="Analytics unavailable" body={error} />
      ) : loading || !data ? (
        <Spinner label="Aggregating tickets" />
      ) : (
        <>
          {/* ---- KPI band: the requested open / assigned / closed counts ---- */}
          <div className="stagger-fade-up mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Open" value={data.open} sub="Unpicked, fresh" tone="error" />
            <StatCard
              label="In progress"
              value={data.inProgress + data.waitingOnEmployee}
              sub={`${data.inProgress} agent-side · ${data.waitingOnEmployee} waiting on employee`}
              tone="teal"
            />
            <StatCard
              label="Resolved"
              value={data.resolved}
              sub="To be re-opened or closed"
              tone="ok"
            />
            <StatCard label="Closed" value={data.closed} sub="Signed off" tone="ok" />
          </div>

          {/* ---- time metrics ---- */}
          <div className="stagger-fade-up mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              label="Avg first response"
              value={
                data.avgFirstResponseHrs == null
                  ? "—"
                  : formatHrs(data.avgFirstResponseHrs * 3_600_000)
              }
              sub={`${data.answeredShare}% of tickets answered`}
              tone="teal"
            />
            <StatCard
              label="Median first reply"
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
              label="Median solve"
              value={data.medianSolveHrs == null ? "—" : formatHrs(data.medianSolveHrs * 3_600_000)}
              sub="Half resolved within"
              tone="teal"
            />
          </div>

          {/* ---- distributions ---- */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.responseDistribution?.length > 0 && (
              <section>
                <p className="mb-3 text-caption font-medium text-ink-3">First response time</p>
                <div className="border border-surface-2 bg-surface p-4">
                  <HistogramBars
                    data={data.responseDistribution}
                    xLabel="tickets"
                    yLabel="answered within"
                  />
                </div>
              </section>
            )}
            {data.solveDistribution?.length > 0 && (
              <section>
                <p className="mb-3 text-caption font-medium text-ink-3">Time to solve</p>
                <div className="border border-surface-2 bg-surface p-4">
                  <HistogramBars
                    data={data.solveDistribution}
                    xLabel="tickets"
                    yLabel="solved within"
                  />
                </div>
              </section>
            )}
          </div>

          {/* ---- status split bars ---- */}
          <section className="mb-8">
            <p className="mb-3 text-caption font-medium text-ink-3">Status split</p>
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
                yLabel="tickets"
                xLabel="current status"
              />
            </div>
          </section>
          {/* ---- volume + backlog trend (created / resolved / open pile) ---- */}
          {data.trend?.length > 0 && (
            <section className="mb-8">
              <p className="mb-3 text-caption font-medium text-ink-3">
                Volume &amp; backlog trend ({WINDOWS.find((w) => w.key === window)?.label} ·
                creations, resolutions and the open pile at each day's end)
              </p>
              <div className="border border-surface-2 bg-surface p-4">
                <TimeLines
                  data={data.trend}
                  series={[
                    { key: "created", label: "Created", color: "#47a2b0" },
                    { key: "resolved", label: "Resolved", color: "#abc7ca" },
                    { key: "backlog", label: "Backlog", color: "#ffd97a" },
                  ]}
                  yLabel="tickets"
                  xLabel={window === "24h" ? "hour of day" : "day (ends at)"}
                />
              </div>
            </section>
          )}

          {/* ---- aging of the unresolved pile (how long the waiting waited) ---- */}
          {data.aging?.length > 0 && (
            <section className="mb-8">
              <p className="mb-3 text-caption font-medium text-ink-3">
                Aging of unresolved (all time)
              </p>
              <div className="border border-surface-2 bg-surface p-4">
                <CountBars
                  data={data.aging}
                  xKey="bucket"
                  yKey="count"
                  height={180}
                  yLabel="currently open"
                  xLabel="age since raised"
                />
              </div>
            </section>
          )}

          {/* ---- peak activity heatmap (weekday × hour of creation) ---- */}
          {data.heatmap?.total > 0 && (
            <section className="mb-8">
              <p className="mb-3 text-caption font-medium text-ink-3">
                Peak activity — creations by weekday × hour (all time)
              </p>
              <div className="border border-surface-2 bg-surface p-4 overflow-x-auto">
                <Heatmap heatmap={data.heatmap} />
              </div>
            </section>
          )}

          {/* ---- resolution SLA compliance (per-priority targets) ---- */}
          {data.sla?.resolvable > 0 && (
            <section className="mb-8">
              <p className="mb-3 text-caption font-medium text-ink-3">
                Resolution SLA compliance (targets: urgent 8h · high 24h · medium 48h · low 72h)
              </p>
              <div className="border border-surface-2 bg-surface p-5">
                <div className="mb-5 flex items-end gap-6">
                  <p className="font-mono text-[34px] leading-none text-teal">
                    {data.sla.complianceRate == null ? "—" : `${data.sla.complianceRate}%`}
                  </p>
                  <p className="text-caption text-ink-3">
                    {data.sla.withinSla} within target · {data.sla.breached} breached of{" "}
                    {data.sla.resolvable} resolvable
                  </p>
                </div>
                <CountBars
                  data={data.sla.byPriority}
                  xKey="priority"
                  yKey="complianceRate"
                  height={160}
                  suffix="%"
                  yLabel="% within target"
                  xLabel="ticket priority"
                />
              </div>
            </section>
          )}

          {/* ---- category load + repetitive subjects (the KB signal) ---- */}
          <section>
            <p className="mb-3 text-caption font-medium text-ink-3">Where the tickets come from</p>
            <div className="border border-surface-2 bg-surface p-5">
              {data.categories?.length ? (
                <RankedBars rows={data.categories} labelKey="category" valueKey="total" />
              ) : (
                <p className="text-caption text-ink-3">No tickets in this window yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
