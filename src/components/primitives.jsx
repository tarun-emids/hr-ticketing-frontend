import { IconInbox, IconLoader2 } from "@tabler/icons-react";

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <IconLoader2 size={24} className="animate-spin text-teal" />
      <p className="text-caption text-warm/50">{label}…</p>
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-2 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-surface-2 bg-surface p-4">
          <div className={`mb-2 h-3 rounded-md bg-surface-2 ${i % 3 === 1 ? "w-2/3" : "w-1/2"}`} />
          <div className="h-2 w-1/3 rounded-md bg-surface-2/60" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = <IconInbox />, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-warm/20 bg-surface px-6 py-14 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-warm/50"
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="text-h3 text-warm">{title}</h3>
      {body && <p className="max-w-sm text-body text-warm/55">{body}</p>}
    </div>
  );
}

/* Stat tile: big tabular figure, small secondary label. */
export function StatCard({ label, value, sub, tone = "warm" }) {
  const toneColors = {
    warm: "text-warm",
    teal: "text-teal-deep",
    ok: "text-ok-deep",
    error: "text-error-deep",
    accent: "text-accent-deep",
  };
  return (
    <div className="rounded-xl border border-surface-2 bg-surface p-4 shadow-xs">
      <p className="text-caption font-medium text-warm/50">{label}</p>
      <p className={`mt-2 text-h3 tabular-nums ${toneColors[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-caption text-warm/40">{sub}</p>}
    </div>
  );
}

export function Avatar({ name, tone = "surface", size = "h-8 w-8 text-[11px]" }) {
  const tones = {
    surface: "bg-surface-2 text-teal-deep",
    dark: "bg-canvas text-warm",
    teal: "bg-teal text-canvas",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-mono font-medium ${tones[tone]} ${size}`}
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

// eslint-disable-next-line no-unused-vars -- Comp is referenced as a JSX component.
export function Button({ as: Comp = "button", className = "", variant = "primary", ...props }) {
  const base =
    "mono-label inline-flex items-center justify-center gap-2 border px-4 py-3 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const variants = {
    primary: "border-teal bg-teal text-warm hover:bg-teal-light",
    ghost: "border-warm/35 bg-transparent text-warm hover:border-teal hover:text-teal-deep",
    flat: "border-transparent text-warm/60 hover:text-warm",
  };
  return (
    <Comp className={`${base} ${variants[variant] ?? variants.ghost} ${className}`} {...props} />
  );
}
