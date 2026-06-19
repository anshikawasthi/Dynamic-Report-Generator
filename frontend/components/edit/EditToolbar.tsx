"use client";

import { useState } from "react";
import { saveCustomization } from "@/lib/api";
import type { EditState } from "@/components/a2ui/EditModeContext";
import { CheckCircle, Eye, Pencil, X } from "lucide-react";

interface Props {
  reportId: string;
  editState: EditState;
  allKpiLabels: string[];
  allTabLabels: string[];
  allSectionIds: string[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function EditToolbar({
  reportId,
  editState,
  allKpiLabels,
  allTabLabels,
  allSectionIds,
}: Props) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showPreview, setShowPreview] = useState(false);

  const doneUrl =
    typeof window !== "undefined" ? window.location.pathname : "#";

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const visibleKpis =
        editState.visibleKpis.size === allKpiLabels.length
          ? null
          : Array.from(editState.visibleKpis);

      const visibleTabs =
        editState.visibleTabs.size === allTabLabels.length
          ? null
          : Array.from(editState.visibleTabs);

      const visibleComponents =
        editState.visibleComponents.size === allSectionIds.length
          ? null
          : Array.from(editState.visibleComponents);

      // Serialise visibleSeries: Set → array per componentId (null = all visible)
      const visibleSeriesOut: Record<string, string[] | null> = {};
      for (const [cid, seriesSet] of Object.entries(editState.visibleSeries)) {
        visibleSeriesOut[cid] = Array.from(seriesSet);
      }

      // Serialise visibleAssets — always send the explicit list so backend knows
      // exactly which assets should be visible (never rely on null = "all").
      const visibleAssets = Array.from(editState.visibleAssets);

      // Serialise kpiOrder (empty array = use default order)
      const kpiOrder = editState.kpiOrder.length > 0 ? editState.kpiOrder : null;
      const tabOrder = editState.tabOrder.length > 0 ? editState.tabOrder : null;
      const sectionOrder = editState.sectionOrder.length > 0 ? editState.sectionOrder : null;

      await saveCustomization(reportId, {
        visibleKpis,
        labelOverrides: editState.labelOverrides,
        visibleTabs,
        visibleComponents,
        chartTypeOverrides: editState.chartTypeOverrides,
        fieldLabelOverrides: editState.fieldLabelOverrides,
        visibleSeries: visibleSeriesOut,
        visibleAssets,
        kpiOrder,
        tabOrder,
        sectionOrder,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: mode badge */}
        <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
          <Pencil className="w-4 h-4" />
          Edit Mode
          <span className="text-xs font-normal text-amber-600">
            — changes are visible to the customer after saving
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Preview as Customer */}
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 bg-white border border-amber-300 hover:bg-amber-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview as Customer
          </button>

          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              saveStatus === "saved"
                ? "bg-green-100 text-green-700 border border-green-300"
                : saveStatus === "error"
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-amber-600 text-white hover:bg-amber-700"
            }`}
          >
            {saveStatus === "saving" && (
              <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            )}
            {saveStatus === "saved" && <CheckCircle className="w-3.5 h-3.5" />}
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "error"
              ? "Error — retry"
              : "Save Changes"}
          </button>

          <a
            href="/portal"
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 bg-white border border-amber-300 hover:bg-amber-50 transition-colors"
          >
            Done
          </a>
        </div>
      </div>

      {/* Customer Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white shrink-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="w-4 h-4" />
                Customer Preview
                <span className="text-gray-400 font-normal text-xs ml-1">
                  — save changes first to see your latest customisations
                </span>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* iframe renders the customer URL (no ?edit=true) */}
            <iframe
              src={doneUrl}
              className="flex-1 w-full border-0"
              title="Customer report preview"
            />
          </div>
        </div>
      )}
    </>
  );
}
