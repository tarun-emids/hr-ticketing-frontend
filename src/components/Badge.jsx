const CHIP =
  "mono-label inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-[3px]";

export default function Badge({ label, className = "", size = "sm" }) {
  return (
    <span className={`${CHIP} ${size === "md" ? "text-[11px] px-2.5 py-1" : "text-[10px]"} ${className}`}>
      {label}
    </span>
  );
}

/* Signal colours confirm, never lead. Two signals max on a surface. */
const STATUS_STYLES = {
  Open: "text-link border-link/35",
  "In Progress": "text-teal border-teal/45",
  "Waiting on Employee": "text-accent border-accent/35",
  Resolved: "text-ok border-ok/35",
  Closed: "text-warm/45 border-warm/15",
};

export function StatusBadge({ status, size = "sm" }) {
  return (
    <Badge label={status} size={size} className={STATUS_STYLES[status] ?? STATUS_STYLES.Closed} />
  );
}

const PRIORITY_STYLES = {
  Urgent: "text-error border-error/45",
  High: "text-accent border-accent/40",
  Medium: "text-warm/65 border-warm/20",
  Low: "text-warm/40 border-warm/10",
};

export function PriorityBadge({ priority, size = "sm" }) {
  return (
    <Badge label={priority} size={size} className={PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Low} />
  );
}
