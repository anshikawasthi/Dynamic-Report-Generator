"use client";

import type { AtRiskAsset } from "@/lib/types";
import AtRiskTable from "./AtRiskTable";
import { useEditMode } from "@/components/a2ui/EditModeContext";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  assets: AtRiskAsset[];
}

export default function EditableAtRiskTable({ assets }: Props) {
  const { isEditMode, editState, onToggleAsset } = useEditMode();

  if (!isEditMode) {
    // Customer mode: filter out hidden assets entirely
    const visibleAssets = assets.filter((a) => editState.visibleAssets.has(a.id));
    return <AtRiskTable assets={visibleAssets} />;
  }

  // Edit mode: show all assets with per-row eye toggle
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Reuse header from AtRiskTable by rendering a shell */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-t-xl">
        <span className="font-semibold">Editing asset rows</span>
        <span className="font-normal text-amber-600">— hover a row and click the eye icon to hide/show it</span>
      </div>

      {/* Full table with edit overlays */}
      <div className="divide-y divide-gray-100">
        {assets.map((asset) => {
          const isVisible = editState.visibleAssets.has(asset.id);
          return (
            <div key={asset.id} className={`relative group flex items-center transition-opacity ${!isVisible ? "opacity-40" : ""}`}>
              {/* Eye toggle — appears on row hover, left of the row */}
              <button
                onClick={() => onToggleAsset(asset.id)}
                title={isVisible ? "Hide from customer" : "Show to customer"}
                className="shrink-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isVisible
                  ? <EyeOff className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 transition-colors" />
                  : <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-green-600 transition-colors" />
                }
              </button>

              {/* Asset info */}
              <div className="flex-1 py-3 pr-4 flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-sm shrink-0">
                    {asset.assetType === "HVAC" ? "❄️" : asset.assetType === "Controls" ? "🎛️" : "⚙️"}
                  </div>
                  <span className="font-medium text-gray-900 text-sm truncate">{asset.name}</span>
                </div>
                <span className="text-gray-400 text-xs shrink-0">{asset.assetType}</span>
                <span className="text-xs font-medium text-gray-600 shrink-0">{asset.criticality}</span>
                <span className="text-xs font-bold text-gray-800 shrink-0">Risk: {asset.riskScore}</span>
                <p className="text-gray-600 text-xs truncate min-w-0">{asset.recommendation}</p>

                {!isVisible && (
                  <span className="shrink-0 text-xs font-semibold text-red-500 bg-white border border-red-200 px-2 py-0.5 rounded-full">
                    Hidden
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
