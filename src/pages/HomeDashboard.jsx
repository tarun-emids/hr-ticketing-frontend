import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTickets } from "../hooks";
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
const CHAT_ICON =
  "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z";

const QUICK_TERMS = ["Leave", "Payroll", "Payslip", "Benefits", "Insurance", "POSH", "Hybrid"];

function NavBox({ to, icon, title, body, stat, className = "" }) {
  return (
    <Link
      to={to}
      className={`soft-bl group flex items-center gap-5 border border-surface-2 bg-surface p-6 transition-colors hover:border-teal/60 hover:bg-surface-2/40 sm:p-7 ${className}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-surface-2 bg-surface-2 text-teal-light">
        <Icon d={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-h3 text-warm group-hover:text-teal-light">{title}</span>
        <span className="mt-1.5 block text-caption text-warm/45">{body}</span>
        {stat != null && (
          <span className="mono-label mt-2.5 block text-[10px] text-warm/40">{stat}</span>
        )}
      </span>
      <Icon
        d={ARROW}
        className="h-5 w-5 shrink-0 text-warm/25 transition-all group-hover:translate-x-0.5 group-hover:text-teal"
      />
    </Link>
  );
}

// Floating HR-assistant bubble: opens a small conversational window. The
// RAG backend is not wired yet — the window is a placeholder on purpose.
function ChatAssistant() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="HR assistant"
          className="soft-bl w-80 border border-surface-2 bg-surface p-5"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="mono-label text-[10px] text-teal">↘ H R · A S S I S T A N T</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close HR assistant"
              className="border border-warm/15 px-1.5 text-warm/50 transition-colors hover:text-warm"
            >
              ×
            </button>
          </div>
          <div className="rule-teal mb-4" />
          <p className="mono-label mb-2 text-[10px] text-warm/40">
            Answers from the policy library
          </p>
          <div className="border border-surface-2 bg-canvas px-4 py-8 text-center">
            <p className="text-h3 text-warm/85">Coming soon…</p>
            <p className="mono-label mt-2 text-[9px] text-warm/35">
              RAG answers over the knowledge base will land here
            </p>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close HR assistant" : "Open HR assistant"}
        title="HR assistant (coming soon)"
        className="soft-bl flex h-12 w-12 items-center justify-center border border-teal bg-teal text-canvas transition-colors hover:bg-teal-light"
      >
        <Icon d={CHAT_ICON} className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function HomeDashboard() {
  const { user, isAgent } = useAuth();
  // Admin is a rare role: the auth context exposes user/isAgent, so derive it here.
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const { tickets, loading: ticketsLoading } = useTickets();

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
          title="Inbox"
          body="Every employee ticket in one place — search, filters, assignment and replies."
          stat={active > 0 ? `${active} active · ${mine} on you` : "All quiet right now"}
        />
        <NavBox
          to="/hr-dashboard"
          icon={CHART_ICON}
          title="HR dashboard"
          body="Counts by status, category load and first-response performance."
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
          to="/hr-dashboard"
          icon={CHART_ICON}
          title="HR dashboard"
          body="Oversight across all employee tickets — status counts, category load, response times."
          stat={active > 0 ? `${active} active · ${tickets.length} tracked` : "No tickets yet"}
        />
        <NavBox
          to="/kb"
          icon={KB_ICON}
          title="Knowledge base"
          body="Your library search spans both employee and HR documents."
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
      return <p className="px-5 py-4 text-caption text-warm/40">Searching the library…</p>;
    }
    if (suggestState === "error") {
      return (
        <p className="px-5 py-4 text-caption text-error/80">Search is unavailable right now.</p>
      );
    }
    if (!suggestions?.length) {
      return (
        <button
          type="button"
          onClick={submit}
          className="block w-full px-5 py-4 text-left text-caption text-warm/50 hover:text-teal-light"
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
        className="flex w-full items-center gap-4 border-b border-surface-2/70 px-5 py-3 text-left last:border-b-0 hover:bg-surface-2/60"
      >
        <span className="mono-label shrink-0 text-[9px] text-teal">{doc.ref}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-lg font-medium text-warm">{doc.title}</span>
          <span className="mono-label block text-[9px] text-warm/35">{doc.category}</span>
        </span>
        <Icon d={ARROW} className="h-3.5 w-3.5 shrink-0 text-warm/25" />
      </button>
    ));
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* ---- Hero: eMids-branded search plate ---- */}
      <section
        className="soft-bl relative overflow-hidden border border-surface-2 bg-canvas"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] teal-gradient" aria-hidden />
        <div className="relative flex flex-col gap-6 bg-canvas/35 px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mono-label text-[10px] text-teal-light">↘ 0 0 / HR DESK</p>
              <h1 className="mt-3 text-h2 text-warm">Hello, {firstName ? firstName : "there"}.</h1>
              <p className="mt-2 text-body-lg text-warm/65">
                {isAdmin
                  ? "Search the full policy library — employee and HR documents."
                  : isAgent
                    ? "Search the HR policy library, or jump into your workspace."
                    : "Search the policy library, or jump into your workspace."}
              </p>
            </div>
            <p className="mono-label text-[10px] text-warm/35">EMIDS / KNOWLEDGE BASE</p>
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
                  className="w-full border border-surface-2 bg-canvas/80 py-3.5 pl-11 pr-4 text-body-lg text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="mono-label border border-l-0 border-teal bg-teal px-5 text-[10px] text-canvas transition-colors hover:bg-teal-light"
              >
                Search
              </button>
            </form>

            {open && suggestState !== "idle" ? (
              <div className="absolute inset-x-0 top-full z-20 mt-1.5 border border-surface-2 bg-surface soft-bl">
                {suggestionBody()}
              </div>
            ) : null}
          </div>

          {/* Quick terms */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label mr-1 text-[9px] text-warm/30">Try:</span>
            {QUICK_TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setQuery(term);
                  navigate(`/kb?q=${encodeURIComponent(term)}`);
                }}
                className="mono-label border border-warm/15 bg-canvas/50 px-2.5 py-1.5 text-[9px] text-warm/55 transition-colors hover:border-teal hover:text-teal"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Workspace navigation boxes ---- */}
      <section className="mt-10">
        <p className="mono-label mb-4 text-[10px] text-warm/40">0 1 / W O R K S P A C E</p>
        <div className="rule-teal mb-6" />
        {boxes}
      </section>

      {/* ---- Floating HR-assistant placeholder (chat bubble) ---- */}
      <ChatAssistant />
    </div>
  );
}
