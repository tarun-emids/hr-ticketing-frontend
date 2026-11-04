// Chart primitives (src/admin) — recharts wrapped to the design system:
// one accent (teal), no gradients, small quiet labels, grid never louder
// than the data. Colors read the CSS theme variables so light and dark
// surfaces both work; every chart is responsive: give it a sized parent.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TEAL = "#0d9488";
const TEAL_LIGHT = "#5eead4";

const AXIS_STYLE = {
  tick: {
    fill: "var(--app-warm, #18181b)",
    fillOpacity: 0.6,
    fontSize: 11,
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif",
  },
  stroke: "var(--app-surface-2, #f4f4f5)",
};

const GRID = "color-mix(in srgb, var(--app-warm, #18181b) 12%, transparent)";

// Warm-neutral hint text inside chart frames (theme-aware).
const CONSUMED_CAPTION = "var(--app-warm, #18181b)";

const tooltipStyle = {
  contentStyle: {
    background: "var(--app-surface, #ffffff)",
    border: "1px solid var(--app-surface-2, #e4e4e7)",
    borderRadius: 10,
    fontSize: 12,
    color: "var(--app-warm, #18181b)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: CONSUMED_CAPTION, fillOpacity: 0.55, fontSize: 11 },
  itemStyle: { color: CONSUMED_CAPTION, fontSize: 12 },
};

// Rotated y-axis caption — the "what am I looking at" label every chart
// carries (recharts measures it inside-left).
const Y_LABEL_STYLE = {
  fill: "var(--app-warm, #18181b)",
  fillOpacity: 0.45,
  fontSize: 10,
  fontFamily: "Inter Variable, Inter, system-ui, sans-serif",
};

export function CountBars({
  data,
  xKey,
  yKey,
  height = 200,
  suffix = "",
  yLabel = "tickets",
  xLabel,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: xLabel ? 34 : 10, left: 12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          axisLine={{ stroke: AXIS_STYLE.stroke }}
          tickLine={false}
          style={AXIS_STYLE.tick}
        >
          {xLabel && <Label value={xLabel} offset={10} position="bottom" style={Y_LABEL_STYLE} />}
        </XAxis>
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          style={AXIS_STYLE.tick}
          label={{ value: yLabel, angle: -90, position: "left", style: Y_LABEL_STYLE }}
        />
        <Tooltip cursor={{ fill: "rgba(13,148,136,0.08)" }} {...tooltipStyle} />
        <Bar
          dataKey={yKey}
          fill={TEAL}
          maxBarSize={28}
          radius={[3, 3, 0, 0]}
          name={`${yKey}${suffix}`}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// One line per series: [ { key, label, color? }, ... ] over {label, ...values}.
export function TimeLines({ data, series, height = 220, yLabel = "tickets", xLabel }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: xLabel ? 34 : 10, left: 12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={{ stroke: AXIS_STYLE.stroke }}
          tickLine={false}
          style={AXIS_STYLE.tick}
          interval="preserveStartEnd"
        >
          {xLabel && <Label value={xLabel} offset={10} position="bottom" style={Y_LABEL_STYLE} />}
        </XAxis>
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          style={AXIS_STYLE.tick}
          label={{ value: yLabel, angle: -90, position: "left", style: Y_LABEL_STYLE }}
        />
        <Tooltip {...tooltipStyle} />
        <Legend
          verticalAlign="top"
          align="center"
          wrapperStyle={{ fontSize: 11, color: CONSUMED_CAPTION, opacity: 0.65, paddingBottom: 6 }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color || TEAL}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Two-line combo (e.g. created vs resolved) with a single shared axis.
export function DualCountLines({ data, lines, height = 220 }) {
  return (
    <TimeLines
      data={data}
      series={lines.map((l, i) => ({
        ...l,
        color: i === 0 ? TEAL : TEAL_LIGHT,
      }))}
      height={height}
    />
  );
}

// Distribution bars (backend histogram rows: {to, count}) as a thin bar list;
// xLabel captions the numeric axis, yLabel (optional) the bucket column.
export function HistogramBars({ data, height = 180, xLabel = "tickets", yLabel = null }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 26, left: 8 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          style={AXIS_STYLE.tick}
        >
          <Label value={xLabel} offset={10} position="bottom" style={Y_LABEL_STYLE} />
        </XAxis>
        <YAxis
          type="category"
          dataKey="to"
          axisLine={false}
          tickLine={false}
          width={64}
          style={AXIS_STYLE.tick}
          label={
            yLabel
              ? {
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: Y_LABEL_STYLE,
                }
              : undefined
          }
        />
        <Tooltip cursor={{ fill: "rgba(13,148,136,0.08)" }} {...tooltipStyle} />
        <Bar dataKey="count" fill={TEAL} maxBarSize={16} name="tickets" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Weekday × hour creation grid WITHOUT recharts — a pure CSS intensity map:
// one accent, alpha carries the count, the busiest cell gets an outline.
const peakLabel = (day, hour) => `${day} ${String(hour).padStart(2, "0")}:00`;

export function Heatmap({ heatmap }) {
  const { days, cells, peak } = heatmap;
  const max = Math.max(1, ...cells.flat());
  return (
    <div className="min-w-[560px]">
      <div className="grid grid-cols-[3rem_repeat(24,1fr)]">
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="pb-1 text-center font-mono text-[9px] text-warm/30">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
      </div>
      {days.map((day, d) => (
        <div key={day} className="grid grid-cols-[3rem_repeat(24,1fr)] items-center">
          <span className="text-[10px] font-medium text-warm/50">{day}</span>
          {cells[d].map((count, h) => {
            const isPeak = peak && peak.day === day && peak.hour === h;
            return (
              <span
                key={h}
                title={`${peakLabel(day, h)} — ${count}`}
                className={`mx-px h-4 rounded-[2px] ${
                  isPeak ? "outline outline-1 outline-teal" : ""
                }`}
                style={{
                  backgroundColor:
                    count > 0
                      ? `color-mix(in srgb, var(--app-teal) ${Math.round(15 + 85 * (count / max))}%, transparent)`
                      : "color-mix(in srgb, var(--app-warm) 6%, transparent)",
                }}
              />
            );
          })}
        </div>
      ))}
      <p className="mt-3 text-caption text-warm/40">
        {peak
          ? `Busiest cell: ${peakLabel(peak.day, peak.hour)} — ${peak.count}`
          : "No creations yet."}
      </p>
    </div>
  );
}

// Simple horizontal breakdown bars rendered WITHOUT recharts (labels + counts)
export function RankedBars({ rows, labelKey, valueKey, max }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-caption text-warm/70">{row[labelKey]}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span
              className="block h-2 rounded-full bg-teal"
              style={{ width: `${Math.max(4, (row[valueKey] / top) * 100)}%` }}
              aria-hidden
            />
          </span>
          <span className="w-10 text-right font-mono text-[11px] text-warm/80">
            {row[valueKey]}
          </span>
        </li>
      ))}
    </ul>
  );
}
