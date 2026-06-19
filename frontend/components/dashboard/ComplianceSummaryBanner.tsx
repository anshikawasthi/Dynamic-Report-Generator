"use client";

import type { KpiMetric } from "@/lib/types";
import EditableLabel from "@/components/edit/EditableLabel";

interface Props {
  kpis: KpiMetric[];
}

// Determine overall compliance health from all KPIs in this report
function overallStatus(kpis: KpiMetric[]): { label: string; color: string; bg: string } {
  const above = kpis.filter((k) => k.targetStatus === "above").length;
  const below = kpis.filter((k) => k.targetStatus === "below").length;
  if (below === 0) return { label: "All targets met", color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (below === kpis.length) return { label: "All targets missed", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  return { label: `${above} of ${kpis.length} targets met`, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
}

const directionArrow: Record<string, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

const directionColor: Record<string, string> = {
  up: "text-green-600",
  down: "text-red-500",
  flat: "text-gray-400",
};

const targetBadge: Record<string, { text: string; cls: string }> = {
  above:    { text: "Above target", cls: "bg-green-100 text-green-700" },
  on_track: { text: "On track",     cls: "bg-blue-100 text-blue-700" },
  below:    { text: "Below target", cls: "bg-red-100 text-red-600" },
};

export default function ComplianceSummaryBanner({ kpis }: Props) {
  const status = overallStatus(kpis);

  return (
    <div className={`rounded-xl border p-5 ${status.bg}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          <EditableLabel originalText="Compliance Overview" />
        </h2>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* KPI score row — one cell per compliance KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const badge = targetBadge[kpi.targetStatus] ?? targetBadge.on_track;
          const momColor = directionColor[kpi.momDirection] ?? "text-gray-500";
          const momArrow = directionArrow[kpi.momDirection] ?? "→";

          return (
            <div
              key={kpi.label}
              className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-2 shadow-sm"
            >
              {/* Label + target badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {kpi.label}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                  {badge.text}
                </span>
              </div>

              {/* Big value */}
              <span className="text-3xl font-bold text-gray-900">{kpi.value}</span>

              {/* MOM / YoY row */}
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <EditableLabel originalText="MOM" className="text-gray-400" />
                  <span className={`font-semibold ${momColor}`}>
                    {momArrow} {kpi.mom}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <EditableLabel originalText="YoY" className="text-gray-400" />
                  <span className={`font-semibold ${directionColor[kpi.yoyDirection] ?? "text-gray-500"}`}>
                    {directionArrow[kpi.yoyDirection] ?? "→"} {kpi.yoy}
                  </span>
                </span>
              </div>

              {/* Target */}
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <EditableLabel originalText="Target" className="text-gray-400" />:
                <span className="font-medium text-gray-600">{kpi.target}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
