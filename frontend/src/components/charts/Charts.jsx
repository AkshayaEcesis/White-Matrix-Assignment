/**
 * Dashboard charts (Recharts). Palette validated for colour-vision deficiency
 * (blue #2a78d6 / orange #eb6834: CVD ΔE 24.7, contrast ≥ 3:1). Identity is never
 * colour-alone: multi-series charts always carry a legend, and every chart has a tooltip.
 */
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

export const CHART = {
  series1: '#059669', // Emerald jewel
  series2: '#f59e0b', // Radiant amber
  grid: '#f1f5f9',
  axis: '#64748b',
  surface: '#ffffff',
}

const axisProps = { tick: { fill: CHART.axis, fontSize: 12, fontWeight: 500 }, tickLine: false, axisLine: { stroke: CHART.grid } }
const tooltipProps = {
  cursor: { fill: 'rgba(15, 23, 42, 0.04)' },
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
  itemStyle: { color: '#334155', fontWeight: 500 },
}
const legendProps = { iconType: 'circle', iconSize: 8, wrapperStyle: { fontSize: 12, color: '#334155' } }

/** Horizontal stacked bars: pending vs resolved per category (district / department). */
export function StackedBreakdownChart({ data, labelKey = 'label', height }) {
  const h = height || Math.max(220, data.length * 30 + 60)
  return (
    <div style={{ height: h }} role="img" aria-label="Pending and resolved grievances by group. See the table for exact values.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey={labelKey} width={150} {...axisProps} interval={0} />
          <Tooltip {...tooltipProps} />
          <Legend {...legendProps} />
          <Bar dataKey="pending" name="Pending" stackId="a" fill={CHART.series2} stroke={CHART.surface} strokeWidth={2} maxBarSize={18} />
          <Bar dataKey="resolved" name="Resolved" stackId="a" fill={CHART.series1} stroke={CHART.surface} strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Single-series vertical bars (e.g. grievances by status). The card title names the series. */
export function SimpleBarChart({ data, labelKey = 'label', valueKey = 'count', name = 'Grievances', height = 240 }) {
  return (
    <div style={{ height }} role="img" aria-label={`${name} chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={labelKey} {...axisProps} interval={0} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey={valueKey} name={name} fill={CHART.series1} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Submitted vs resolved per month. */
export function TrendChart({ data, height = 260 }) {
  return (
    <div style={{ height }} role="img" aria-label="Monthly submitted and resolved grievances">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip {...tooltipProps} cursor={{ stroke: CHART.grid, strokeWidth: 1 }} />
          <Legend {...legendProps} />
          <Line type="monotone" dataKey="submitted" name="Submitted" stroke={CHART.series1} strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="resolved" name="Resolved" stroke={CHART.series2} strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
