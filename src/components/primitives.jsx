export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <svg className="h-6 w-6 animate-spin text-accent-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V2A10 10 0 1 0 22 12h-2a8 8 0 0 0-8-8z" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="space-y-3 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
          <div className={`mb-2 h-4 rounded bg-slate-200 ${i % 3 === 1 ? "w-2/3" : "w-1/2"}`} />
          <div className="h-3 w-1/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = "🗂️", title, body }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
      <div className="text-3xl" aria-hidden>{icon}</div>
      <h3 className="font-semibold text-slate-700">{title}</h3>
      {body && <p className="max-w-sm text-sm text-slate-500">{body}</p>}
    </div>
  );
}

export function StatCard({ label, value, sub, tone = "slate" }) {
  const tones = {
    slate: "text-slate-900",
    accent: "text-accent-700",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function Avatar({ name, tone = "bg-accent-100 text-accent-700", size = "h-8 w-8 text-xs" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${size}`}
      title={name}
    >
      {initials}
    </span>
  );
}

export function Button({ as: Comp = "button", className = "", variant = "primary", ...props }) {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed",
    accent: "bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed",
    flat: "text-slate-700 hover:bg-slate-100 disabled:opacity-50",
    outline: "spare",
  };
  const v = variant === "outline"
    ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    : variants[variant] ?? variants.outline;
  return (
    <Comp
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${v} ${className}`}
      {...props}
    />
  );
}
