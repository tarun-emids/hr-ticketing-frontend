import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge, PriorityBadge } from "./Badge";
import { PRIO_ORDER } from "./sorting";
import { timeAgo } from "../utils";

const CATEGORY_OPTIONS = ["Payroll", "Leave", "Benefits", "Onboarding", "Policy", "Other"];
// One tint per category so tickets read as visually grouped (demo feedback).
const CAT_DOTS = {
  Payroll: "bg-emerald-500",
  Leave: "bg-amber-500",
  Benefits: "bg-sky-500",
  Onboarding: "bg-violet-500",
  Policy: "bg-rose-500",
  Other: "bg-slate-400",
};

function CategoryCell({ category }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <span className={`h-2 w-2 rounded-full ${CAT_DOTS[category] ?? "bg-slate-400"}`} title={category} />
      {category}
    </span>
  );
}
const STATUS_OPTIONS = ["Open", "In Progress", "Waiting on Employee", "Resolved", "Closed"];
const PRIORITY_OPTIONS = ["Urgent", "High", "Medium", "Low"];

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-accent-500 focus:outline-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function SortButton({ label, mode, sortMode, setSortMode, className = "" }) {
  const active = sortMode === mode;
  return (
    <button
      onClick={() =>
        setSortMode(active ? `-${mode}` : mode)
      }
      className={`flex items-center gap-1 uppercase transition-colors ${className} ${
        active ? "text-accent-700" : "hover:text-slate-700"
      }`}
      title={`Sort by ${label}`}
    >
      {label}
      <span className={active ? "opacity-100" : "opacity-0 group-hover:opacity-40"}>
        {sortMode === `-${mode}` ? "↓" : active ? "↑" : "↕"}
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
        const cmp =
          typeof av === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return dir === "desc" ? -cmp : cmp;
      });
  }, [tickets, query, status, category, priority, assignee, sortMode, users]);

  const filtersActive = Boolean(status || category || priority || assignee || query);

  return (
    <section>
      <div className="flex flex-col gap-3 rounded-t-xl border border-slate-200 border-b-0 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="m21 21-5.2-5.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject, description, ID or employee…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:outline-none"
            />
          </div>
          <p className="shrink-0 text-xs text-slate-400">
            {filtered.length} of {tickets.length} tickets
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <FilterSelect label="Status" value={status} onChange={setStatus}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} />
          <FilterSelect label="Category" value={category} onChange={setCategory}
            options={CATEGORY_OPTIONS.map((s) => ({ value: s, label: s }))} />
          <FilterSelect label="Priority" value={priority} onChange={setPriority}
            options={PRIORITY_OPTIONS.map((s) => ({ value: s, label: s }))} />
          <FilterSelect
            label="Assignee"
            value={assignee}
            onChange={setAssignee}
            options={users
              .filter((u) => u.role === "agent")
              .map((a) => ({ value: a.id, label: a.name }))}
          />
          {filtersActive && (
            <button
              onClick={() => { setStatus(""); setCategory(""); setPriority(""); setAssignee(""); setQuery(""); }}
              className="text-xs font-semibold text-accent-700 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-b-xl border border-slate-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="group border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3"><SortButton label="Ticket" mode="subject" sortMode={sortMode} setSortMode={setSortMode} /></th>
              <th className="px-3 py-3"><SortButton label="Employee" mode="employee" sortMode={sortMode} setSortMode={setSortMode} /></th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3"><SortButton label="Priority" mode="priority" sortMode={sortMode} setSortMode={setSortMode} /></th>
              <th className="px-3 py-3"><SortButton label="Status" mode="status" sortMode={sortMode} setSortMode={setSortMode} /></th>
              <th className="px-3 py-3">Assignee</th>
              <th className="py-3 pl-3 pr-5 text-right"><SortButton label="Updated" mode="updated" sortMode={sortMode} setSortMode={setSortMode} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <tr key={t.id} className="group hover:bg-slate-50/70">
                <td className="px-5 py-3">
                  <Link to={`/tickets/${t.id}`}>
                    <span className="font-medium text-slate-900 group-hover:text-accent-700">{t.subject}</span>
                    <span className="block text-[11px] text-slate-400">{t.id}</span>
                  </Link>
                </td>
                <td className="px-3 text-slate-600">{nameOf(t.employeeId)}</td>
                <td className="px-3"><CategoryCell category={t.category} /></td>
                <td className="px-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-3"><StatusBadge status={t.status} /></td>
                <td className="px-3">
                  {t.assigneeId ? (
                    <span className="text-xs text-slate-600">{firstNameOf(t.assigneeId)}</span>
                  ) : (
                    <span className="text-xs italic text-slate-300">Unassigned</span>
                  )}
                </td>
                <td className="py-3 pl-3 pr-5 text-right text-xs text-slate-500">{timeAgo(t.updatedAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-400">
                  No tickets match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ul className="flex list-none flex-col divide-y rounded-b-xl border border-slate-200 bg-white md:hidden">
        {filtered.map((t) => (
          <li key={t.id}>
            <Link to={`/tickets/${t.id}`} className="block px-4 py-3 hover:bg-slate-50">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">{t.id} · {nameOf(t.employeeId)}</span>
                <span className="text-[11px] text-slate-400">{timeAgo(t.updatedAt)}</span>
              </div>
              <p className="text-sm font-medium text-slate-900">{t.subject}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${CAT_DOTS[t.category] ?? "bg-slate-400"}`} />
                  {t.category}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-16 text-center text-sm text-slate-400">No tickets match the current filters.</li>
        )}
      </ul>
    </section>
  );
}
