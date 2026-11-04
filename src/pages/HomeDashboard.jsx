import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector } from "../state/hooks";
import { selectIsAgent, selectUser } from "../state/authSlice";
import { useTicketsPage } from "../hooks";
import { searchKb } from "../api/client";
import heroImg from "../assets/kb-hero.png";
import { Spinner } from "../components/primitives";
import { Icon, PATHS } from "../components/icons";

const SEARCH_ICON = PATHS.search;
const ARROW = PATHS.arrow;
const TICKETS_ICON =
  "M9 12h6m-9 3.3h4.5M8.7 21h6.6a2.7 2.7 0 0 0 2.7-2.7V5.7A2.7 2.7 0 0 0 15.3 3H8.7A2.7 2.7 0 0 0 6 5.7v12.6A2.7 2.7 0 0 0 8.7 21Z";
const NEW_ICON = "M12 4.5v15m7.5-7.5h-15";
const INBOX_ICON =
  "M3 13.1h5l1.8 2.7h4.4l1.8-2.7h5M4.9 6.2h5.2M4.9 6.2A2 2 0 0 0 3 8.2v9.6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.2a2 2 0 0 0-1.9-2H4.9Z";
const CHART_ICON = "M3 13.2V20h6v-6.8M14.5 4v16h-6V9.5M21 20h-6V8h6Z";
const KB_ICON =
  "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zm20 0h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z";

const QUICK_TERMS = ["Leave", "Payroll", "Payslip", "Benefits", "Insurance", "POSH", "Hybrid"];

function NavBox({ to, icon, title, body, stat, className = "" }) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-5 rounded-xl border border-surface-2 bg-surface p-6 shadow-xs transition-colors hover:border-teal/50 hover:bg-surface-2 sm:p-7 ${className}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-teal-deep">
        <Icon d={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-h3 text-warm">{title}</span>
        <span className="mt-1.5 block text-body text-warm/55">{body}</span>
        {stat != null && (
          <span className="mt-2.5 block text-caption font-medium text-warm/45">{stat}</span>
        )}
      </span>
      <Icon
        d={ARROW}
        className="h-5 w-5 shrink-0 text-warm/25 transition-all group-hover:translate-x-0.5 group-hover:text-teal"
      />
    </Link>
  );
}

export default function HomeDashboard() {
  const user = useAppSelector(selectUser);
  const isAgent = useAppSelector(selectIsAgent);
  // Admin is a rare role: the auth slice exposes user/isAgent, so derive it here.
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const view = useTicketsPage(user?.id, { page: 1, pageSize: 100 });
  const tickets = view.items;
  const ticketsLoading = view.loading;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(null); // null = idle, [] = no match
  const [suggestState, setSuggestState] = useState("idle"); // idle | loading | ready | error
  const [open, setOpen] = useState(false);
  const searchWrapRef = useRef(null);
  const seqRef = useRef(0); // guards against a slow older response landing late
  const firstName = (user?.name ?? "").split(" ")[0];

  // Debounced live suggestions while typing (needs >= 2 chars).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions(null);
      setSuggestState("idle");
      setOpen(false);
      return undefined;
    }
    const seq = ++seqRef.current;
    const t = setTimeout(() => {
      setSuggestState("loading");
      setOpen(true);
      searchKb(user.id, q)
        .then((rows) => {
          if (seq === seqRef.current) {
            setSuggestions(rows.slice(0, 3));
            setSuggestState("ready");
          }
        })
        .catch(() => {
          if (seq === seqRef.current) setSuggestState("error");
        });
    }, 250);
    return () => clearTimeout(t);
  }, [query, user.id]);

  // Close the suggestion panel on outside click.
  useEffect(() => {
    const onDown = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    setOpen(false);
    navigate(q ? `/kb?q=${encodeURIComponent(q)}` : "/kb");
  };

  const openSuggestion = (slug) => {
    setOpen(false);
    setQuery("");
    navigate(`/kb/${slug}`);
  };

  // Role-aware live stats for the nav boxes.
  let boxes;
  if (ticketsLoading) {
    boxes = (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="soft-bl border border-surface-2 bg-surface p-6">
          <Spinner label="Loading workspace" />
        </div>
      </div>
    );
  } else if (isAgent) {
    const active = tickets.filter((t) => !["Resolved", "Closed"].includes(t.status)).length;
    const mine = tickets.filter(
      (t) => t.assigneeId === user.id && !["Resolved", "Closed"].includes(t.status),
    ).length;
    boxes = (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <NavBox
          to="/inbox"
          icon={INBOX_ICON}
          title="Tickets"
          body="Every employee ticket in one place — searchable, filterable, sortable."
          stat={active > 0 ? `${active} open · ${mine} on you` : "All quiet right now"}
        />
        <NavBox
          to="/assigned-to-me"
          icon={TICKETS_ICON}
          title="My tickets"
          body="Only the tickets assigned to your name — your own backlog at a glance."
          stat={mine > 0 ? `${mine} assigned to you` : "Nothing assigned yet"}
        />
        <NavBox
          to="/hr-dashboard"
          icon={CHART_ICON}
          title="My performance"
          body="Your score trends, response and solve-speed charts, workload and categories."
          stat={tickets.length ? `${tickets.length} tickets tracked` : "No tickets yet"}
        />
        <NavBox
          to="/kb"
          icon={KB_ICON}
          title="Knowledge base"
          body="Every policy document your role can read — searchable, viewable in page, downloadable."
          stat="Employee + HR library"
        />
      </div>
    );
  } else if (isAdmin) {
    const active = tickets.filter((t) => !["Resolved", "Closed"].includes(t.status)).length;
    boxes = (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <NavBox
          to="/admin"
          icon={CHART_ICON}
          title="Ticket analytics"
          body="Volume & backlog trend, status split, aging, heatmap, resolution SLA per priority."
          stat={active > 0 ? `${active} active · ${tickets.length} tracked` : "No tickets yet"}
        />
        <NavBox
          to="/admin/worktable"
          icon={INBOX_ICON}
          title="Agents × tickets"
          body="Score-ranked agents and the repeated-subject list that tells you what to write next."
          stat="Leaderboard + drill-downs"
        />
        <NavBox
          to="/admin/accounts"
          icon={TICKETS_ICON}
          title="Accounts"
          body="Admins, HR agents and employees grouped and searchable — roles and offboarding."
          stat="Access control"
        />
        <NavBox
          to="/admin/kb"
          icon={KB_ICON}
          title="Policy library"
          body="Upload and version the PDFs the desk and the assistant answer from."
          stat="Employee + HR library"
        />
      </div>
    );
  } else {
    const mine = tickets.filter((t) => t.employeeId === user.id);
    const mineActive = mine.filter((t) => !["Resolved", "Closed"].includes(t.status)).length;
    boxes = (
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <NavBox
          to="/my-tickets"
          icon={TICKETS_ICON}
          title="My tickets"
          body="Track status, follow the thread and add replies to your requests."
          stat={
            mine.length
              ? mine.length === 1
                ? "1 request · " + (mineActive ? `${mineActive} in progress` : "all settled")
                : `${mine.length} requests · ${mineActive} in progress`
              : "No requests yet"
          }
        />
        <NavBox
          to="/new-ticket"
          icon={NEW_ICON}
          title="New ticket"
          body="Raise a payroll, leave, benefits or policy question — attach files if needed."
          stat="HR replies on the thread"
        />
        <NavBox
          to="/kb"
          icon={KB_ICON}
          title="Knowledge base"
          body="Browse every policy document you are allowed to read — in one catalogue."
          stat="Your role's library"
        />
      </div>
    );
  }

  const suggestionBody = () => {
    if (suggestState === "loading") {
      return <p className="px-5 py-3.5 text-caption text-warm/50">Searching the library…</p>;
    }
    if (suggestState === "error") {
      return (
        <p className="px-5 py-4 text-caption text-error-deep">Search is unavailable right now.</p>
      );
    }
    if (!suggestions?.length) {
      return (
        <button
          type="button"
          onClick={submit}
          className="block w-full px-5 py-4 text-left text-body text-warm/55 hover:text-teal-deep"
        >
          No direct hit — press Enter to search “{query.trim()}” anyway ↘
        </button>
      );
    }
    return suggestions.map((doc) => (
      <button
        key={doc.slug}
        type="button"
        onClick={() => openSuggestion(doc.slug)}
        className="flex w-full items-center gap-4 border-b border-surface-2 px-5 py-3 text-left last:border-b-0 hover:bg-surface-2"
      >
        <span className="font-mono text-[11px] shrink-0 text-teal-deep">{doc.ref}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-lg font-medium text-warm">{doc.title}</span>
          <span className="block text-caption text-warm/45">{doc.category}</span>
        </span>
        <Icon d={ARROW} className="h-3.5 w-3.5 shrink-0 text-warm/25" />
      </button>
    ));
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* ---- Hero: eMids-branded search plate ---- */}
      <section
        className="relative overflow-hidden rounded-2xl border border-surface-2 bg-canvas shadow-xs"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div className="relative flex flex-col gap-6 bg-canvas/35 px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-h2 text-warm">Hello, {firstName ? firstName : "there"}.</h1>
              <p className="mt-2 text-body-lg text-warm/70">
                {isAdmin
                  ? "Search the full policy library — employee and HR documents."
                  : isAgent
                    ? "Search the HR policy library, or jump into your workspace."
                    : "Search the policy library, or jump into your workspace."}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div ref={searchWrapRef} className="relative max-w-2xl">
            <form onSubmit={submit} role="search" className="flex">
              <div className="relative flex-1">
                <Icon
                  d={SEARCH_ICON}
                  className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-warm/40"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setOpen(true)}
                  placeholder="Search the knowledge base — try “leave carry forward” or “payslip”…"
                  aria-label="Search the knowledge base"
                  className="w-full rounded-l-xl rounded-r-none border border-surface-2 bg-surface py-3 pl-11 pr-4 text-body-lg text-warm placeholder:text-warm/35 focus:border-teal focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-l-none rounded-r-xl bg-teal px-5 py-3 text-body font-medium text-canvas transition-colors hover:opacity-90"
              >
                Search
              </button>
            </form>

            {open && suggestState !== "idle" ? (
              <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-surface-2 bg-surface shadow-lg">
                {suggestionBody()}
              </div>
            ) : null}
          </div>

          {/* Quick terms */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-caption text-warm/40">Try:</span>
            {QUICK_TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setQuery(term);
                  navigate(`/kb?q=${encodeURIComponent(term)}`);
                }}
                className="rounded-full border border-warm/15 bg-canvas/60 px-3 py-1 text-caption font-medium text-warm/60 transition-colors hover:border-teal hover:text-teal-deep"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Workspace navigation boxes ---- */}
      <section className="mt-10">
        <p className="mb-4 text-caption font-medium text-warm/50">Workspace</p>
        {boxes}
      </section>
    </div>
  );
}
