const SIZES = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export default function Badge({ label, color, dot = false, size = "sm" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${SIZES[size]} ${color}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
}

const STATUS_COLORS = {
  Open: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10",
  "In Progress": "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/10",
  "Waiting on Employee": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/10",
  Resolved: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/10",
  Closed: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10",
};

export function StatusBadge({ status, size = "sm" }) {
  return (
    <Badge
      label={status}
      color={STATUS_COLORS[status] ?? STATUS_COLORS.Closed}
      dot
      size={size}
    />
  );
}

const PRIORITY_COLORS = {
  Urgent: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10",
  High: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/10",
  Medium: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10",
  Low: "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/10",
};

export function PriorityBadge({ priority, size = "sm" }) {
  return (
    <Badge label={priority} color={PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.Low} size={size} />
  );
}
