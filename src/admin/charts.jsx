// Brand chart primitives (src/admin) — recharts wrapped to the Emids rules:
// one accent (Emids Teal), no gradients, mono 10px labels, grid never louder
// than the data. Every chart is responsive: give it a sized parent.
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

const TEAL = "#47a2b0";
const TEAL_LIGHT = "#abc7ca";
const GRID = "#262626"; // surface-2
const WARM = "#f2f2f0";

const AXIS_STYLE = {
  tick: { fill: WARM, fontSize: 10, fontFamily: "JetBrains Mono, Consolas, monospace" },
  stroke: GRID,
};

const tooltipStyle = {
  contentStyle: {
    background: "#141414",
    border: `1px solid ${GRID}`,
    borderRadius: 0,
    borderBottomLeftRadius: 8,
    fontSize: 11,
    color: WARM,
  },
  labelStyle: { color: "rgba(242,242,240,0.5)", fontSize: 10 },
  itemStyle: { color: WARM },
};

// Rotated y-axis caption — the "what am I looking at" label every chart
// carries (recharts measures it inside-left). Tiny mono, quiet warm.
const Y_LABEL_STYLE = {
  fill: "rgba(242,242,240,0.45)",
  fontSize: 9,
  fontFamily: "JetBrains Mono, Consolas, monospace",
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
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: xLabel ? 20 : 4, left: -4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} axisLine={{ stroke: GRID }} tickLine={false} style={AXIS_STYLE.tick}>
          {xLabel && (
            <Label value={xLabel} offset={8} position="insideBottom" style={Y_LABEL_STYLE} />
          )}
        </XAxis>
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          style={AXIS_STYLE.tick}
          label={{ value: yLabel, angle: -90, position: "insideLeft", style: Y_LABEL_STYLE }}
        />
        <Tooltip cursor={{ fill: "rgba(71,162,176,0.08)" }} {...tooltipStyle} />
        <Bar dataKey={yKey} fill={TEAL} maxBarSize={28} name={`${yKey}${suffix}`} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// One line per series: [ { key, label, color? }, ... ] over {label, ...values}.
export function TimeLines({ data, series, height = 220, yLabel = "tickets", xLabel }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: xLabel ? 20 : 4, left: -4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={{ stroke: GRID }}
          tickLine={false}
          style={AXIS_STYLE.tick}
          interval="preserveStartEnd"
        >
          {xLabel && (
            <Label value={xLabel} offset={8} position="insideBottom" style={Y_LABEL_STYLE} />
          )}
        </XAxis>
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          style={AXIS_STYLE.tick}
          label={{ value: yLabel, angle: -90, position: "insideLeft", style: Y_LABEL_STYLE }}
        />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10, color: "rgba(242,242,240,0.4)" }} />
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
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          style={AXIS_STYLE.tick}
        >
          <Label value={xLabel} offset={-2} position="insideBottom" style={AXIS_STYLE.tick} />
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
        <Tooltip cursor={{ fill: "rgba(71,162,176,0.08)" }} {...tooltipStyle} />
        <Bar dataKey="count" fill={TEAL} maxBarSize={16} name="tickets" radius={[0, 1, 1, 0]} />
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
          <span key={h} className="pb-1 text-center font-mono text-[8px] text-warm/25">
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
      </div>
      {days.map((day, d) => (
        <div key={day} className="grid grid-cols-[3rem_repeat(24,1fr)] items-center">
          <span className="mono-label text-[9px] text-warm/40">{day}</span>
          {cells[d].map((count, h) => {
            const isPeak = peak && peak.day === day && peak.hour === h;
            return (
              <span
                key={h}
                title={`${peakLabel(day, h)} — ${count}`}
                className={`mx-px h-4 rounded-[1px] ${
                  isPeak ? "outline outline-1 outline-warm/60" : ""
                }`}
                style={{
                  backgroundColor:
                    count > 0
                      ? `rgba(71,162,176,${(0.16 + 0.84 * (count / max)).toFixed(2)})`
                      : "rgba(255,255,255,0.03)",
                }}
              />
            );
          })}
        </div>
      ))}
      <p className="mt-3 text-[10px] text-warm/30">
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
          <span className="h-2 flex-1 bg-surface-2">
            <span
              className="block h-2 bg-teal"
              style={{ width: `${Math.max(4, (row[valueKey] / top) * 100)}%` }}
              aria-hidden
            />
          </span>
          <span className="w-10 text-right font-mono text-[11px] text-warm">{row[valueKey]}</span>
        </li>
      ))}
    </ul>
  );
}
