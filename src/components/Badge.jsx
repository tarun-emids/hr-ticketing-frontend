const CHIP =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 font-medium";

export default function Badge({ label, className = "", size = "sm" }) {
  return (
    <span
      className={`${CHIP} ${size === "md" ? "text-caption px-2.5 py-1" : "text-micro"} ${className}`}
    >
      {label}
    </span>
  );
}

/* Status tints carry meaning; text keeps an AA-contrast deep pair per theme. */
const STATUS_STYLES = {
  Open: "text-link-deep bg-link/10 border-link/25",
  "In Progress": "text-teal-deep bg-teal/10 border-teal/30",
  "Waiting on Employee": "text-accent-deep bg-accent/10 border-accent/30",
  Resolved: "text-ok-deep bg-ok/10 border-ok/25",
  Closed: "text-ink-3 bg-warm/5 border-warm/15",
};

export function StatusBadge({ status, size = "sm" }) {
  return (
    <Badge label={status} size={size} className={STATUS_STYLES[status] ?? STATUS_STYLES.Closed} />
  );
}

const PRIORITY_STYLES = {
  Urgent: "text-error-deep bg-error/10 border-error/30",
  High: "text-accent-deep bg-accent/10 border-accent/30",
  Medium: "text-ink-2 bg-warm/5 border-warm/15",
  Low: "text-ink-3 bg-warm/5 border-warm/10",
};

export function PriorityBadge({ priority, size = "sm" }) {
  return (
    <Badge
      label={priority}
      size={size}
      className={PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Low}
    />
  );
}
