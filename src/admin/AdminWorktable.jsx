import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { agentLeaderboard, adminOverview } from "./api";
import { Spinner, EmptyState } from "../components/primitives";

const PERIODS = ["24h", "7d", "30d"];
const TABS = [
  {
    key: "agents",
    label: "AGENTS",
    hint: "top performers · click an agent for their full metrics",
  },
  { key: "tickets", label: "TICKETS", hint: "what employees ask for most — improve the KB here" },
];

// Admin console — the AGENTS × TICKETS worktable (route /admin/worktable).
// One screen, two panes, one period switch:
//   AGENTS pane    leaderboard (resolved desc) → clicking a row opens the
//                  agent drill-down with its graphs (/admin/agents/:id).
//   TICKETS pane   category loads + the repetitive subjects inside each —
//                  the "what to write into the knowledge base next" list.
export default function AdminWorktable() {
  const { user } = useAuth();
  const actorId = user?.id;
  const [tab, setTab] = useState("agents");
  const [period, setPeriod] = useState("30d");
  const [agents, setAgents] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const leaderboard = agentLeaderboard(actorId, period);
    // the tickets pane reads the same overview (category breakdown is embedded)
    const windowsFor = period === "24h" ? "24h" : period === "7d" ? "7d" : "30d";
    const worktable = adminOverview(actorId, windowsFor);
    Promise.all([leaderboard, worktable])
      .then(([board, ov]) => {
        if (!alive) return;
        setAgents(board);
        setOverview(ov);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [actorId, period]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label mb-2 text-[10px] text-teal">↘ A D M I N · W O R K T A B L E</p>
          <div className="rule-teal mb-4" />
          <h1 className="text-h3 text-warm">Agents × Tickets</h1>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={`mono-label border px-3 py-1.5 text-[10px] transition-colors ${
                period === p
                  ? "border-teal bg-teal text-canvas"
                  : "border-warm/15 text-warm/50 hover:border-teal hover:text-teal"
              }`}
            >
              {p === "24h" ? "24 HOURS" : p === "7d" ? "1 WEEK" : "1 MONTH"}
            </button>
          ))}
        </div>
      </header>

      {/* the AGENTS / TICKETS toggle */}
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            title={t.hint}
            className={`mono-label border px-4 py-2 text-[10px] transition-colors ${
              tab === t.key
                ? "border-teal bg-teal text-canvas"
                : "border-warm/15 text-warm/50 hover:border-teal hover:text-teal"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mono-label mb-6 text-[9px] text-warm/30">
        {TABS.find((t) => t.key === tab)?.hint}
      </p>

      {error ? (
        <EmptyState icon="↘" title="Worktable unavailable" body={error} />
      ) : loading || !agents || !overview ? (
        <Spinner label="Ranking the work" />
      ) : tab === "agents" ? (
        <AgentsPane agents={agents} period={period} />
      ) : (
        <TicketsPane overview={overview} />
      )}
    </div>
  );
}

// ---- AGENTS pane ----------------------------------------------------------

function AgentsPane({ agents, period }) {
  if (!agents.length) {
    return (
      <EmptyState
        icon="↘"
        title="No agent activity in this window"
        body="Top performers appear once agents accept or resolve tickets in the selected period."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {agents.map((agent, rank) => (
        <Link
          key={agent.agentId}
          to={`/admin/agents/${agent.agentId}`}
          className="group flex items-center gap-4 border border-surface-2 bg-surface p-4 transition-colors hover:border-teal/50 hover:bg-surface-2/40"
        >
          <span className="mono-label w-8 shrink-0 text-[11px] text-teal">
            {String(rank + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-lg font-medium text-warm group-hover:text-teal-light">
              {agent.name}
            </span>
            <span className="mono-label block text-[9px] text-warm/35">{agent.email}</span>
          </span>
          <MiniStat label="COMPLETED" value={agent.completed} tone="ok" />
          <MiniStat label="PENDING" value={agent.pending} tone="warm" />
          <MiniStat
            label="AVG SOLVE"
            value={agent.avgSolveHrs == null ? "—" : `${agent.avgSolveHrs}h`}
            tone="teal"
          />
        </Link>
      ))}
      <p className="mt-4 text-caption text-warm/30">
        Ranked by completed tickets in {labelFor(period)} · click an agent for the full graph view
        (response times, time-to-solve, per-bucket activity).
      </p>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const color = tone === "ok" ? "text-ok" : tone === "teal" ? "text-teal-light" : "text-warm";
  return (
    <span className="hidden w-24 flex-col items-end sm:flex">
      <span className="mono-label text-[8px] text-warm/35">{label}</span>
      <span className={`font-mono text-[15px] ${color}`}>{value}</span>
    </span>
  );
}

// ---- TICKETS pane ---------------------------------------------------------

function TicketsPane({ overview }) {
  const categories = overview.categories ?? [];
  if (!categories.length) {
    return (
      <EmptyState
        icon="↘"
        title="Nothing to read yet"
        body="Categories and repetitive subjects surface as tickets come in."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {categories.map((cat) => (
        <section key={cat.category} className="border border-surface-2 bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-h3 text-warm">{cat.category}</p>
            <p className="mono-label text-[9px] text-warm/35">
              {cat.total} TICKETS · {cat.open} STILL OPEN
            </p>
          </div>
          {cat.repeatedSubjects?.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {cat.repeatedSubjects.map((rep, i) => (
                <li key={i} className="border-l-2 border-teal/40 bg-canvas/60 px-3 py-2">
                  <span className="mono-label text-[9px] text-teal">{rep.count}× ASKED</span>
                  <p className="text-body text-warm/85">{rep.title}</p>
                  <p className="mono-label text-[8px] text-warm/30">{rep.sampleRefs.join(" · ")}</p>
                </li>
              ))}
              <p className="mt-1 text-caption text-warm/35">
                Same question keeps appearing — consider a policy page or clearer KB entry.
              </p>
            </ul>
          ) : (
            <p className="text-caption text-warm/40">No repetitive subjects in this category.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function labelFor(period) {
  return period === "24h"
    ? "the last 24 hours"
    : period === "7d"
      ? "the last week"
      : "the last month";
}
