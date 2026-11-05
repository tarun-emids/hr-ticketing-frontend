import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTicketsPage } from "../hooks";
import { IconArrowDown, IconArrowUp, IconArrowsSort, IconSearch } from "@tabler/icons-react";
import { StatusBadge, PriorityBadge } from "./Badge";
import { timeAgo } from "../utils";

const PAGE_SIZE_OPTIONS = [25, 50];

const CATEGORY_OPTIONS = ["Payroll", "Leave", "Benefits", "Onboarding", "Policy", "Other"];
const STATUS_OPTIONS = ["Open", "In Progress", "Waiting on Employee", "Resolved", "Closed"];
const PRIORITY_OPTIONS = ["Urgent", "High", "Medium", "Low"];

/* Data tinting: teal family + the two human accents. Never stacked for decoration. */
const CAT_DOTS = {
  Payroll: "bg-teal",
  Leave: "bg-accent",
  Benefits: "bg-link",
  Onboarding: "bg-mauve",
  Policy: "bg-teal-deep",
  Other: "bg-warm/30",
};

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-2 text-caption font-medium text-ink-3">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-surface-2 bg-surface px-2 py-1.5 text-caption font-medium text-warm focus:border-teal focus:outline-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortButton({ label, mode, sortMode, setSortMode }) {
  const active = sortMode === mode || sortMode === `-${mode}`;
  return (
    <button
      onClick={() => setSortMode(active ? `-${mode}` : mode)}
      className={`text-caption font-medium inline-flex items-center gap-1 transition-colors ${
        active ? "text-teal-deep" : "text-ink-3 hover:text-warm"
      }`}
      title={`Sort by ${label}`}
    >
      {label}
      <span
        aria-hidden
        className={active ? "opacity-100" : "opacity-0 group-hover/head:opacity-40"}
      >
        {sortMode === `-${mode}` ? (
          <IconArrowDown size={12} />
        ) : active ? (
          <IconArrowUp size={12} />
        ) : (
          <IconArrowsSort size={12} />
        )}
      </span>
    </button>
  );
}

export default function TicketTable({ viewerId, users, fixedAssignee }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortMode, setSortMode] = useState("updated");

  // Server round-trips per keystroke are cheap to regret: 300ms debounce.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const view = useTicketsPage(viewerId, {
    page,
    pageSize,
    sort: sortMode.replace(/^-/, ""),
    order: sortMode.startsWith("-") ? "desc" : "asc",
    status: status || undefined,
    category: category || undefined,
    priority: priority || undefined,
    assigneeId: fixedAssignee || assignee || undefined,
    q: debouncedQuery || undefined,
  });
  const tickets = view.items;

  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? "—";
  const firstNameOf = (id) => nameOf(id).split(" ")[0];

  const filtered = tickets;

  const filtersActive = Boolean(status || category || priority || assignee || debouncedQuery);

  // A filter change invalidates the current page: the queries partition
  // differently, so page=N no longer means the same rows.
  useEffect(() => {
    setPage(1);
  }, [status, category, priority, assignee, debouncedQuery, pageSize, sortMode]);

  const totalPages = Math.max(1, Math.ceil(view.total / view.pageSize));

  return (
    <section>
      {view.error && (
        <div className="border border-surface-2 bg-canvas p-3 text-caption text-warm/60">
          Couldn't load tickets: {view.error}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-surface-2 bg-surface-2/60 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <IconSearch
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject, description, ID or employee…"
              className="w-full rounded-lg border border-surface-2 bg-surface py-2.5 pl-9 pr-3 text-body text-warm placeholder:text-ink-3 focus:border-teal focus:outline-none"
            />
          </div>
          <p className="shrink-0 text-caption text-ink-3">
            {view.loading
              ? "loading…"
              : `${view.total} ticket${view.total === 1 ? "" : "s"} · page ${view.page} of ${totalPages}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <FilterSelect
            label="STATUS"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <FilterSelect
            label="CATEGORY"
            value={category}
            onChange={setCategory}
            options={CATEGORY_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <FilterSelect
            label="PRIORITY"
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          {!fixedAssignee && (
            <FilterSelect
              label="ASSIGNEE"
              value={assignee}
              onChange={setAssignee}
              options={users
                .filter((u) => u.role === "agent")
                .map((a) => ({ value: a.id, label: a.name }))}
            />
          )}
          {filtersActive && (
            <button
              onClick={() => {
                setStatus("");
                setCategory("");
                setPriority("");
                setAssignee("");
                setQuery("");
                setPage(1);
              }}
              className="text-caption font-medium text-teal-deep hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-b-xl border border-surface-2 bg-surface shadow-xs md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="group/head border-b border-surface-2 bg-surface-2/60">
              <th className="px-5 py-3">
                <SortButton
                  label="Ticket"
                  mode="subject"
                  sortMode={sortMode}
                  setSortMode={setSortMode}
                />
              </th>
              <th className="px-3 py-3">
                <SortButton
                  label="Employee"
                  mode="employee"
                  sortMode={sortMode}
                  setSortMode={setSortMode}
                />
              </th>
              <th className="px-3 py-3 text-caption font-medium text-ink-3">Category</th>
              <th className="px-3 py-3">
                <SortButton
                  label="Priority"
                  mode="priority"
                  sortMode={sortMode}
                  setSortMode={setSortMode}
                />
              </th>
              <th className="px-3 py-3">
                <SortButton
                  label="Status"
                  mode="status"
                  sortMode={sortMode}
                  setSortMode={setSortMode}
                />
              </th>
              <th className="px-3 py-3 text-caption font-medium text-ink-3">Assignee</th>
              <th className="py-3 pl-3 pr-5 text-right">
                <SortButton
                  label="Updated"
                  mode="updated"
                  sortMode={sortMode}
                  setSortMode={setSortMode}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-2">
            {filtered.map((t) => (
              <tr key={t.id} className="group transition-colors hover:bg-surface-2/50">
                <td className="px-5 py-3.5">
                  <Link to={`/tickets/${t.id}`}>
                    <span className="text-body font-medium text-warm group-hover:text-teal-deep">
                      {t.subject}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-ink-3">{t.id}</span>
                  </Link>
                </td>
                <td className="px-3 text-body text-ink-2">{nameOf(t.employeeId)}</td>
                <td className="px-3">
                  <span className="inline-flex items-center gap-1.5 text-body text-ink-2">
                    <span
                      className={`h-2 w-2 rounded-full ${CAT_DOTS[t.category] ?? "bg-warm/30"}`}
                      title={t.category}
                    />
                    {t.category}
                  </span>
                </td>
                <td className="px-3">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-3">
                  {t.assigneeId ? (
                    <span className="text-body text-ink-2">{firstNameOf(t.assigneeId)}</span>
                  ) : (
                    <span className="text-body italic text-ink-3">Unassigned</span>
                  )}
                </td>
                <td className="py-3.5 pl-3 pr-5 text-right text-caption text-ink-3">
                  {timeAgo(t.updatedAt)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-body text-ink-3">
                  No tickets match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex list-none flex-col divide-y divide-surface-2 overflow-hidden rounded-xl border border-surface-2 bg-surface md:hidden">
        {filtered.map((t) => (
          <li key={t.id}>
            <Link
              to={`/tickets/${t.id}`}
              className="block px-4 py-3 transition-colors hover:bg-surface-2/50"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-ink-3">{t.id}</span>
                <span className="text-caption text-ink-3">{timeAgo(t.updatedAt)}</span>
              </div>
              <p className="text-body font-medium text-warm">{t.subject}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <span className="inline-flex items-center gap-1.5 rounded-md border border-warm/15 bg-warm/5 px-2 py-0.5 text-micro font-medium text-ink-2">
                  <span
                    className={`h-2 w-2 rounded-full ${CAT_DOTS[t.category] ?? "bg-warm/30"}`}
                  />
                  {t.category}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-16 text-center text-body text-ink-3">
            No tickets match the current filters.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-t-0 border-surface-2 bg-surface-2 p-3">
        <div className="flex items-center gap-2">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              onClick={() => setPageSize(size)}
              className={`mono-label text-[10px] px-2 py-1 border ${
                pageSize === size ? "border-teal text-teal-deep" : "border-surface-2 text-warm/40"
              }`}
            >
              {size} / page
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={view.page <= 1 || view.loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="mono-label text-[10px] px-3 py-1.5 border border-surface-2 disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <button
            disabled={!view.hasNext || view.loading}
            onClick={() => setPage((p) => p + 1)}
            className="mono-label text-[10px] px-3 py-1.5 border border-surface-2 disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      </div>
    </section>
  );
}
