const CHIP =
  "mono-label inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-1";

export default function Badge({ label, className = "", size = "sm" }) {
  return (
    <span className={`${CHIP} ${size === "md" ? "text-[11px] px-2.5 py-1" : "text-[10px]"} ${className}`}>
      {label}
    </span>
  );
}

/* Signal colours confirm, never lead. Two signals max on a surface. */
const STATUS_STYLES = {
  Open: "text-link-deep border-link/35",
  "In Progress": "text-teal-deep border-teal/45",
  "Waiting on Employee": "text-accent-deep border-accent/35",
  Resolved: "text-ok-deep border-ok/35",
  Closed: "text-warm/45 border-warm/25",
};

export function StatusBadge({ status, size = "sm" }) {
  return (
    <Badge label={status} size={size} className={STATUS_STYLES[status] ?? STATUS_STYLES.Closed} />
  );
}

const PRIORITY_STYLES = {
  Urgent: "text-error-deep border-error/45",
  High: "text-accent-deep border-accent/40",
  Medium: "text-warm/65 border-warm/30",
  Low: "text-warm/40 border-warm/20",
};

export function PriorityBadge({ priority, size = "sm" }) {
  return (
    <Badge label={priority} size={size} className={PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Low} />
  );
}
