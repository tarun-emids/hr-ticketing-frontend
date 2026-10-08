import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IconArrowDown, IconArrowUp, IconArrowsSort, IconSearch } from "@tabler/icons-react";
import { StatusBadge, PriorityBadge } from "./Badge";
import { PRIO_ORDER } from "./sorting";
import { timeAgo } from "../utils";

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
    <label className="flex items-center gap-2 mono-label text-[10px] text-warm/40">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-surface-2 bg-canvas px-2 py-1.5 text-[11px] font-medium text-warm focus:border-teal focus:outline-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
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
      className={`mono-label flex items-center gap-1 transition-colors ${
        active ? "text-teal" : "hover:text-warm/80"
      }`}
      title={`Sort by ${label}`}
    >
      {label}
      <span aria-hidden className={active ? "opacity-100" : "opacity-0 group-hover/head:opacity-40"}>
        {sortMode === `-${mode}` ? <IconArrowDown size={12} /> : active ? <IconArrowUp size={12} /> : <IconArrowsSort size={12} />}
      </span>
    </button>
  );
}

export default function TicketTable({ tickets, users }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [sortMode, setSortMode] = useState("updated");

  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? "—";
  const firstNameOf = (id) => nameOf(id).split(" ")[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const [field, dir = "asc"] = sortMode.startsWith("-")
      ? [sortMode.slice(1), "desc"]
      : [sortMode, "asc"];

    const sorters = {
      updated: (t) => Date.parse(t.updatedAt),
      created: (t) => Date.parse(t.createdAt),
      priority: (t) => PRIO_ORDER[t.priority] ?? 0,
      subject: (t) => t.subject.toLowerCase(),
      employee: (t) => nameOf(t.employeeId).toLowerCase(),
      status: (t) => STATUS_OPTIONS.indexOf(t.status),
    };
    const key = sorters[field] ?? sorters.updated;

    return tickets
      .filter(
        (t) =>
          (!status || t.status === status) &&
          (!category || t.category === category) &&
          (!priority || t.priority === priority) &&
          (!assignee || t.assigneeId === assignee) &&
          (!q ||
            t.subject.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            nameOf(t.employeeId).toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const av = key(a);
        const bv = key(b);
        const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
        return dir === "desc" ? -cmp : cmp;
      });
  }, [tickets, query, status, category, priority, assignee, sortMode, users]);

  const filtersActive = Boolean(status || category || priority || assignee || query);

  return (
    <section>
      <div className="flex flex-col gap-4 border border-b-0 border-surface-2 bg-surface-2/40 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <IconSearch
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-warm/30"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject, description, ID or employee…"
              className="w-full border border-surface-2 bg-canvas py-2.5 pl-9 pr-3 text-body-lg text-warm placeholder:text-warm/30 focus:border-teal focus:outline-none"
            />
          </div>
          <p className="mono-label shrink-0 text-[10px] text-warm/40">
            {filtered.length} / {tickets.length} tickets
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <FilterSelect label="STATUS" value={status} onChange={setStatus}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} />
          <FilterSelect label="CATEGORY" value={category} onChange={setCategory}
            options={CATEGORY_OPTIONS.map((s) => ({ value: s, label: s }))} />
          <FilterSelect label="PRIORITY" value={priority} onChange={setPriority}
            options={PRIORITY_OPTIONS.map((s) => ({ value: s, label: s }))} />
          <FilterSelect
            label="ASSIGNEE"
            value={assignee}
            onChange={setAssignee}
            options={users.filter((u) => u.role === "agent").map((a) => ({ value: a.id, label: a.name }))}
          />
          {filtersActive && (
            <button
              onClick={() => { setStatus(""); setCategory(""); setPriority(""); setAssignee(""); setQuery(""); }}
              className="mono-label text-[10px] text-teal hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto border border-surface-2 bg-surface md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="group/head border-b border-surface-2 bg-surface-2/60">
              <th className="px-5 py-3"><SortButton label="Ticket" mode="subject" sortMode={sortMode} setSortMode={setSortMode} /></th>
              <th className="px-3 py-3"><SortButton label="Employee" mode="employee" sortMode={sortMode} setSortMode={setSortMode} /></th>
              <th className="px-3 py-3 mono-label text-[10px] text-warm/40">Category</th>
              <th className="px-3 py-3"><SortButton label="Priority" mode="priority" sortMode={sortMode} setSortMode={setSortMode} /></th>
              <th className="px-3 py-3"><SortButton label="Status" mode="status" sortMode={sortMode} setSortMode={setSortMode} /></th>
              <th className="px-3 py-3 mono-label text-[10px] text-warm/40">Assignee</th>
              <th className="py-3 pl-3 pr-5 text-right"><SortButton label="Updated" mode="updated" sortMode={sortMode} setSortMode={setSortMode} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-2">
            {filtered.map((t) => (
              <tr key={t.id} className="group transition-colors hover:bg-surface-2/60">
                <td className="px-5 py-3.5">
                  <Link to={`/tickets/${t.id}`}>
                    <span className="text-body-lg font-medium text-warm group-hover:text-teal-light">{t.subject}</span>
                    <span className="mono-label block pt-0.5 text-[10px] text-warm/35">{t.id}</span>
                  </Link>
                </td>
                <td className="px-3 text-body text-warm/70">{nameOf(t.employeeId)}</td>
                <td className="px-3">
                  <span className="inline-flex items-center gap-1.5 text-body text-warm/70">
                    <span className={`h-2 w-2 ${CAT_DOTS[t.category] ?? "bg-warm/30"}`} title={t.category} />
                    {t.category}
                  </span>
                </td>
                <td className="px-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-3"><StatusBadge status={t.status} /></td>
                <td className="px-3">
                  {t.assigneeId ? (
                    <span className="text-body text-warm/70">{firstNameOf(t.assigneeId)}</span>
                  ) : (
                    <span className="text-body italic text-warm/25">Unassigned</span>
                  )}
                </td>
                <td className="py-3.5 pl-3 pr-5 text-right text-caption text-warm/45">{timeAgo(t.updatedAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center mono-label text-[10px] text-warm/40">
                  No tickets match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex list-none flex-col divide-y border border-surface-2 bg-surface md:hidden">
        {filtered.map((t) => (
          <li key={t.id}>
            <Link to={`/tickets/${t.id}`} className="block px-4 py-3 hover:bg-surface-2/50">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="mono-label text-[10px] text-warm/40">{t.id}</span>
                <span className="text-caption text-warm/40">{timeAgo(t.updatedAt)}</span>
              </div>
              <p className="text-body-lg font-medium text-warm">{t.subject}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <span className="inline-flex items-center gap-1.5 border border-warm/15 px-2 py-[3px] mono-label text-[10px] text-warm/55">
                  <span className={`h-2 w-2 ${CAT_DOTS[t.category] ?? "bg-warm/30"}`} />
                  {t.category}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-16 text-center mono-label text-[10px] text-warm/40">No tickets match the current filters.</li>
        )}
      </ul>
    </section>
  );
}
