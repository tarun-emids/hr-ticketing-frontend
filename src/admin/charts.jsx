// Brand chart primitives (src/admin) — recharts wrapped to the Emids rules:
// one accent (Emids Teal), no gradients, mono 10px labels, grid never louder
// than the data. Every chart is responsive: give it a sized parent.
import {
  Bar,
  BarChart,
  CartesianGrid,
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

export function CountBars({ data, xKey, yKey, height = 200, suffix = "" }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          style={AXIS_STYLE.tick}
        />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} style={AXIS_STYLE.tick} />
        <Tooltip cursor={{ fill: "rgba(71,162,176,0.08)" }} {...tooltipStyle} />
        <Bar dataKey={yKey} fill={TEAL} maxBarSize={28} name={`${yKey}${suffix}`} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// One line per series: [ { key, label, color? }, ... ] over {label, ...values}.
export function TimeLines({ data, series, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={{ stroke: GRID }}
          tickLine={false}
          style={AXIS_STYLE.tick}
        />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} style={AXIS_STYLE.tick} />
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

// Distribution bars (backend histogram rows: {to, count}) as a thin bar list.
export function HistogramBars({ data, height = 180 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          style={AXIS_STYLE.tick}
        />
        <YAxis
          type="category"
          dataKey="to"
          axisLine={false}
          tickLine={false}
          width={64}
          style={AXIS_STYLE.tick}
        />
        <Tooltip cursor={{ fill: "rgba(71,162,176,0.08)" }} {...tooltipStyle} />
        <Bar dataKey="count" fill={TEAL} maxBarSize={16} name="tickets" radius={[0, 1, 1, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Simple horizontal breakdown bars rendered WITHOUT recharts (labels + counts)
// — category loads read better as ranked lists with inline bars.
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
