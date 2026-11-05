import { IconInbox, IconLoader2 } from "@tabler/icons-react";

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <IconLoader2 size={24} className="animate-spin text-teal" />
      <p className="text-caption text-ink-3">{label}…</p>
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
        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-3"
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="text-h3 text-warm">{title}</h3>
      {body && <p className="max-w-sm text-body text-ink-3">{body}</p>}
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
    <div className="lift rounded-xl border border-surface-2 bg-surface p-4 shadow-xs">
      <p className="text-caption font-medium text-ink-2">{label}</p>
      <p className={`mt-2 text-h3 tabular-nums ${toneColors[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-caption text-ink-3">{sub}</p>}
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

/* Page header band over a photo backdrop. The left-to-right canvas scrim
   keeps the text zone ≥85% opaque so contrast holds in both themes while the
   photo shows through on the right. */
export function PageBanner({ image, position = "center", title, sub, children }) {
  return (
    <section
      className="animate-fade-up relative mb-8 overflow-hidden rounded-2xl border border-surface-2 shadow-xs"
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: "cover",
        backgroundPosition: position,
      }}
    >
      <div className="relative bg-linear-to-r from-canvas/95 via-canvas/85 to-canvas/30 px-6 py-6 sm:px-8">
        <h1 className="text-h1 text-warm">{title}</h1>
        {sub && <p className="mt-1 max-w-xl text-body text-ink-2">{sub}</p>}
        {children}
      </div>
    </section>
  );
}
