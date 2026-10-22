import {
  IconInbox,
  IconLoader2,
} from "@tabler/icons-react";

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <IconLoader2 size={24} className="animate-spin text-teal-deep" />
      <p className="mono-label text-[10px] text-warm/40">{label}</p>
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-2 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse border border-surface-2 bg-surface p-4">
          <div className={`mb-2 h-3 bg-surface-2 ${i % 3 === 1 ? "w-2/3" : "w-1/2"}`} />
          <div className="h-2 w-1/3 bg-surface-2/60" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = <IconInbox />, title, body }) {
  return (
    <div className="soft-bl flex flex-col items-center justify-center gap-2 border border-surface-2 bg-surface px-6 py-14 text-center">
      <div className="text-teal-deep/80" aria-hidden>
        {icon}
      </div>
      <h3 className="mono-label text-[10px] text-warm">{title}</h3>
      {body && <p className="max-w-sm text-caption text-warm/50">{body}</p>}
    </div>
  );
}

/* Metric-card grammar of the system: display-scale figure, tracked mono label. */
export function StatCard({ label, value, sub, tone = "warm" }) {
  const toneColors = {
    warm: "text-warm",
    teal: "text-teal-deep",
    ok: "text-ok-deep",
    error: "text-error-deep",
    accent: "text-accent-deep",
  };
  return (
    <div className="soft-bl border border-surface-2 bg-surface p-4">
      <p className="mono-label text-[10px] text-warm/45">{label}</p>
      <p className={`mt-2 text-h3 tabular-nums ${toneColors[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-caption text-warm/40">{sub}</p>}
    </div>
  );
}

export function Avatar({ name, tone = "surface", size = "h-8 w-8 text-[10px]" }) {
  const tones = {
    surface: "bg-surface-2 text-teal-deep",
    dark: "bg-canvas text-warm",
    teal: "bg-teal text-warm",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-mono font-medium ${tones[tone]} ${size}`}
      title={name}
    >
      {name
        ?.split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}

export function Button({ as: Comp = "button", className = "", variant = "primary", ...props }) {
  const base =
    "mono-label inline-flex items-center justify-center gap-2 border px-4 py-3 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const variants = {
    primary: "border-teal bg-teal text-warm hover:bg-teal-light",
    ghost: "border-warm/35 bg-transparent text-warm hover:border-teal hover:text-teal-deep",
    flat: "border-transparent text-warm/60 hover:text-warm",
  };
  return <Comp className={`${base} ${variants[variant] ?? variants.ghost} ${className}`} {...props} />;
}
