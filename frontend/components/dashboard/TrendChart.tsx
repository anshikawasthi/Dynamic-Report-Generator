"use client";

import { useState } from "react";
import type { PresentationConfig, FieldSchema } from "@/lib/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  data: Record<string, string | number>[];
  presentation: PresentationConfig;
  schema: Record<string, FieldSchema>;
  /** Optional: restrict which series are rendered (used in edit + customer modes). */
  visibleSeriesKeys?: string[];
}

const SERIES_COLORS: Record<string, string> = {
  pmCompliance: "#2563eb",       // blue
  reactiveCompliance: "#f59e0b", // amber
  remoteCompliance: "#10b981",   // green
};

const SERIES_LABELS: Record<string, string> = {
  pmCompliance: "PM Compliance %",
  reactiveCompliance: "Reactive Compliance %",
  remoteCompliance: "Remote Compliance %",
};

type ChartMode = "line" | "bar" | "table";

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">
            {SERIES_LABELS[p.name] ?? p.name}
          </span>
          <span className="font-bold text-gray-900">{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

export default function TrendChart({ data, presentation, visibleSeriesKeys }: Props) {
  const [chartMode, setChartMode] = useState<ChartMode>(
    (presentation.recommendedChart as ChartMode) ?? "line"
  );

  const allYKeys = presentation.yAxisKeys;
  // If caller provides a filter, apply it; otherwise show all
  const yKeys = visibleSeriesKeys
    ? allYKeys.filter((k) => visibleSeriesKeys.includes(k))
    : allYKeys;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Service Health Trend</h3>
          <p className="text-xs text-gray-400 mt-0.5">Rolling 13 months</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["line", "bar", "table"] as ChartMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setChartMode(mode)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                chartMode === mode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartMode !== "table" && (
        <ResponsiveContainer width="100%" height={280}>
          {chartMode === "line" ? (
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={presentation.xAxisKey} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-gray-600">{SERIES_LABELS[value] ?? value}</span>
                )}
              />
              <ReferenceLine y={90} stroke="#d1d5db" strokeDasharray="4 4" label={{ value: "90%", fontSize: 10, fill: "#9ca3af" }} />
              {yKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={SERIES_COLORS[key] ?? "#6b7280"}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={presentation.xAxisKey} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-gray-600">{SERIES_LABELS[value] ?? value}</span>
                )}
              />
              {yKeys.map((key) => (
                <Bar key={key} dataKey={key} name={key} fill={SERIES_COLORS[key] ?? "#6b7280"} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      )}

      {/* Table view */}
      {chartMode === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 text-left font-medium text-gray-500">Month</th>
                {yKeys.map((k) => (
                  <th key={k} className="py-2 px-3 text-right font-medium text-gray-500">
                    {SERIES_LABELS[k] ?? k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-700 font-medium">{String(row[presentation.xAxisKey])}</td>
                  {yKeys.map((k) => (
                    <td key={k} className="py-2 px-3 text-right text-gray-800">
                      {row[k]}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
