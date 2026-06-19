"use client";

import type { AtRiskAsset } from "@/lib/types";
import AssetDetailCard from "./AssetDetailCard";
import { useEditMode } from "@/components/a2ui/EditModeContext";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  asset: AtRiskAsset;
}

export default function EditableAssetDetailCard({ asset }: Props) {
  const { isEditMode, editState, onToggleAsset } = useEditMode();

  const isVisible = editState.visibleAssets.has(asset.id);

  if (!isEditMode && !isVisible) return null;

  if (!isEditMode) return <AssetDetailCard asset={asset} />;

  // Edit mode only below
  return (
    <div className={`relative group transition-opacity ${!isVisible ? "opacity-40" : ""}`}>
      <AssetDetailCard asset={asset} />

      {/* Eye toggle — top-right, appears on hover */}
      <button
        onClick={() => onToggleAsset(asset.id)}
        title={isVisible ? "Hide from customer" : "Show to customer"}
        className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-sm text-xs font-medium text-gray-600 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {isVisible ? "Hide" : "Show"}
      </button>

      {!isVisible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl z-10">
          <span className="px-3 py-1.5 bg-gray-800/80 text-white text-xs font-semibold rounded-full">
            Hidden from customer
          </span>
        </div>
      )}
    </div>
  );
}
