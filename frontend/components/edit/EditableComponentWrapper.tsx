"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEditMode } from "@/components/a2ui/EditModeContext";

interface Props {
  componentId: string;
  label: string;
  children: React.ReactNode;
  /** For the TrendChart: pass yAxisKeys so series toggles can be shown. */
  seriesKeys?: string[];
}

const SECTION_LABELS: Record<string, string> = {
  "kpi-grid": "KPI Cards",
  "trend-chart": "Trend Chart",
  "risk-table": "At-Risk Assets Table",
  "compliance-banner": "Compliance Summary",
  "asset-grid": "Asset Grid",
};

const SERIES_LABELS: Record<string, string> = {
  pmCompliance: "PM Compliance",
  reactiveCompliance: "Reactive Compliance",
  remoteCompliance: "Remote Compliance",
};

export default function EditableComponentWrapper({
  componentId,
  label,
  children,
  seriesKeys,
}: Props) {
  const { editState, onToggleComponent, onToggleSeries } = useEditMode();
  const isVisible = editState.visibleComponents.has(componentId);
  const displayLabel = SECTION_LABELS[componentId] ?? label;

  return (
    <div className={`relative group transition-opacity duration-200 ${!isVisible ? "opacity-50" : ""}`}>
      {children}

      {/* Floating controls — fade in on hover, pinned to BOTTOM-right inside the card */}
      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto">

        {/* Per-series toggles (TrendChart only) */}
        {seriesKeys && seriesKeys.length > 0 && isVisible && (
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm px-1.5 py-1">
            <span className="text-[10px] text-gray-400 mr-0.5">Series</span>
            {seriesKeys.map((key) => {
              const seriesVisible = (editState.visibleSeries[componentId] ?? new Set(seriesKeys)).has(key);
              return (
                <button
                  key={key}
                  onClick={() => onToggleSeries(componentId, key, seriesKeys)}
                  title={`${seriesVisible ? "Hide" : "Show"} ${SERIES_LABELS[key] ?? key}`}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    seriesVisible
                      ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      : "text-gray-300 line-through hover:text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {seriesVisible ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                  {SERIES_LABELS[key] ?? key}
                </button>
              );
            })}
          </div>
        )}

        {/* Section visibility toggle */}
        <button
          onClick={() => onToggleComponent(componentId)}
          title={isVisible ? `Hide "${displayLabel}" from customer` : `Show "${displayLabel}" to customer`}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border shadow-sm bg-white/95 backdrop-blur-sm transition-colors ${
            isVisible
              ? "border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
              : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
          }`}
        >
          {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>

      {/* Section label — bottom-left, fades in on hover, opposite side from controls */}
      <div className="absolute bottom-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
        <span className="text-[10px] font-medium text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">
          {displayLabel}
        </span>
      </div>

      {/* Hidden badge — shown when section is hidden */}
      {!isVisible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl z-10">
          <span className="px-3 py-1.5 bg-gray-700/75 text-white text-xs font-medium rounded-full">
            Hidden from customer
          </span>
        </div>
      )}
    </div>
  );
}
