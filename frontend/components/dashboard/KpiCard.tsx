"use client";

import type { KpiMetric } from "@/lib/types";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import EditableLabel from "@/components/edit/EditableLabel";

interface Props {
  kpi: KpiMetric;
}

const directionIcon = (dir: KpiMetric["momDirection"]) => {
  if (dir === "up") return <TrendingUp className="w-3 h-3" />;
  if (dir === "down") return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
};

const directionColor = (dir: KpiMetric["momDirection"]) => {
  if (dir === "up") return "text-green-600";
  if (dir === "down") return "text-red-500";
  return "text-gray-400";
};

const targetBadge = (status: KpiMetric["targetStatus"]) => {
  if (status === "on_track") return "bg-green-50 text-green-700 border-green-200";
  if (status === "above") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-red-50 text-red-600 border-red-200";
};

// Icon per KPI type
const kpiIcon: Record<string, string> = {
  "PM Compliance": "🔧",
  "Reactive Compliance": "⚡",
  "Remote Compliance": "📡",
  CSAT: "⭐",
};

export default function KpiCard({ kpi }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Label */}
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
        <span>{kpiIcon[kpi.label] ?? "📊"}</span>
        {kpi.label}
      </div>

      {/* Big Value */}
      <div className="text-3xl font-bold text-gray-900 leading-none">{kpi.value}</div>

      {/* MOM / YOY */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1">
          <EditableLabel originalText="MOM" className="text-gray-400" />
          <span className={`flex items-center gap-0.5 font-medium ${directionColor(kpi.momDirection)}`}>
            {directionIcon(kpi.momDirection)}
            {kpi.mom}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <EditableLabel originalText="YoY" className="text-gray-400" />
          <span className={`flex items-center gap-0.5 font-medium ${directionColor(kpi.yoyDirection)}`}>
            {directionIcon(kpi.yoyDirection)}
            {kpi.yoy}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <EditableLabel originalText="Target" className="text-gray-400" />
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${targetBadge(kpi.targetStatus)}`}
          >
            {kpi.target}
          </span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        {kpi.insights > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            💡 {kpi.insights} Insight{kpi.insights > 1 ? "s" : ""}
          </span>
        ) : (
          <span />
        )}
        <button className="text-xs text-blue-600 hover:underline font-medium">View Details →</button>
      </div>
    </div>
  );
}
