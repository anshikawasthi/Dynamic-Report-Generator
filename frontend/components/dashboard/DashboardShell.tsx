"use client";

import { useState, useMemo } from "react";
import type { UniversalContract, ReportCustomization } from "@/lib/types";
import type { A2UIMessage } from "@/lib/a2ui-types";
import DashboardHeader from "./DashboardHeader";
import ChatSidebar from "@/components/chat/ChatSidebar";
import A2UIRenderer from "@/components/a2ui/A2UIRenderer";
import { EditModeProvider, type EditState } from "@/components/a2ui/EditModeContext";
import EditToolbar from "@/components/edit/EditToolbar";
import EditableTabBar from "@/components/edit/EditableTabBar";

const TABS = ["Overview", "Insights", "Preventive", "Reactive", "Remote", "CSAT", "Invoicing"];

/** Extract the root Column's explicitList children from A2UI messages. */
function extractSectionIds(messages: A2UIMessage[]): string[] {
  for (const msg of messages) {
    if ("updateComponents" in msg) {
      const root = msg.updateComponents.components.find((c) => c.id === "root");
      if (root?.children && "explicitList" in root.children) {
        return root.children.explicitList;
      }
    }
  }
  return [];
}

interface Props {
  messages: A2UIMessage[];
  contract: UniversalContract;
  isEditMode?: boolean;
  reportId?: string;
  savedCustomization?: ReportCustomization | null;
}

export default function DashboardShell({
  messages,
  contract,
  isEditMode = false,
  reportId = "",
  savedCustomization,
}: Props) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allKpiLabels = contract.kpis.map((k) => k.label);
  const allSectionIds = useMemo(() => extractSectionIds(messages), [messages]);

  // Initialise edit state from saved customisation (or all-visible defaults)
  const [editState, setEditState] = useState<EditState>(() => {
    const sectionIds = extractSectionIds(messages);
    const allAssetIds = contract.atRiskAssets.map((a) => a.id);
    // Restore saved series visibility (convert array → Set per component)
    const savedSeriesMap = savedCustomization?.visibleSeries ?? {};
    const visibleSeriesInit: Record<string, Set<string>> = {};
    for (const [cid, arr] of Object.entries(savedSeriesMap)) {
      if (arr !== null) visibleSeriesInit[cid] = new Set(arr);
    }
    return {
      visibleKpis: new Set(savedCustomization?.visibleKpis ?? allKpiLabels),
      labelOverrides: savedCustomization?.labelOverrides ?? {},
      visibleTabs: new Set(savedCustomization?.visibleTabs ?? TABS),
      visibleComponents: new Set(savedCustomization?.visibleComponents ?? sectionIds),
      chartTypeOverrides: (savedCustomization?.chartTypeOverrides ?? {}) as Record<string, "bar" | "line">,
      fieldLabelOverrides: savedCustomization?.fieldLabelOverrides ?? {},
      visibleSeries: visibleSeriesInit,
      visibleAssets: new Set(savedCustomization?.visibleAssets ?? allAssetIds),
      kpiOrder: savedCustomization?.kpiOrder ?? [],
      tabOrder: savedCustomization?.tabOrder ?? [],
      sectionOrder: savedCustomization?.sectionOrder ?? [],
    };
  });

  const onToggleKpi = (originalLabel: string) => {
    setEditState((prev) => {
      const next = new Set(prev.visibleKpis);
      if (next.has(originalLabel)) next.delete(originalLabel);
      else next.add(originalLabel);
      return { ...prev, visibleKpis: next };
    });
  };

  const onRelabelKpi = (originalLabel: string, newLabel: string) => {
    setEditState((prev) => ({
      ...prev,
      labelOverrides: { ...prev.labelOverrides, [originalLabel]: newLabel },
    }));
  };

  const onToggleTab = (tab: string) => {
    setEditState((prev) => {
      const next = new Set(prev.visibleTabs);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      return { ...prev, visibleTabs: next };
    });
  };

  const onToggleComponent = (componentId: string) => {
    setEditState((prev) => {
      const next = new Set(prev.visibleComponents);
      if (next.has(componentId)) next.delete(componentId);
      else next.add(componentId);
      return { ...prev, visibleComponents: next };
    });
  };

  const onSetChartType = (componentId: string, type: "bar" | "line") => {
    setEditState((prev) => ({
      ...prev,
      chartTypeOverrides: { ...prev.chartTypeOverrides, [componentId]: type },
    }));
  };

  const onSetFieldLabel = (originalText: string, newText: string) => {
    setEditState((prev) => ({
      ...prev,
      fieldLabelOverrides: { ...prev.fieldLabelOverrides, [originalText]: newText },
    }));
  };

  const onToggleSeries = (componentId: string, seriesKey: string, allSeriesKeys: string[]) => {
    setEditState((prev) => {
      const current = prev.visibleSeries[componentId] ?? new Set(allSeriesKeys);
      const next = new Set(current);
      if (next.has(seriesKey)) next.delete(seriesKey);
      else next.add(seriesKey);
      return { ...prev, visibleSeries: { ...prev.visibleSeries, [componentId]: next } };
    });
  };

  const onToggleAsset = (assetId: string) => {
    setEditState((prev) => {
      const next = new Set(prev.visibleAssets);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return { ...prev, visibleAssets: next };
    });
  };

  const onReorderKpis = (newOrder: string[]) => {
    setEditState((prev) => ({ ...prev, kpiOrder: newOrder }));
  };

  const onReorderTabs = (newOrder: string[]) => {
    setEditState((prev) => ({ ...prev, tabOrder: newOrder }));
  };

  const onReorderSections = (newOrder: string[]) => {
    setEditState((prev) => ({ ...prev, sectionOrder: newOrder }));
  };

  return (
    <EditModeProvider
      value={{ isEditMode, editState, onToggleKpi, onRelabelKpi, onToggleTab, onToggleComponent, onSetChartType, onSetFieldLabel, onToggleSeries, onToggleAsset, onReorderKpis, onReorderTabs, onReorderSections }}
    >
      {/* Red border frame in edit mode — wraps everything including the top banner */}
      <div className={`min-h-screen bg-gray-50 flex flex-col${isEditMode ? " border-4 border-[#d22630]" : ""}`}>
        {/* Red EDITING banner — top of page */}
        {isEditMode && (
          <div className="bg-[#d22630] text-white text-xs font-bold py-1.5 px-4 text-center tracking-wide shrink-0">
            ✏️ EDITING MODE — Customers see the saved version. Hidden elements and label changes take effect after clicking Save Changes.
          </div>
        )}

        <DashboardHeader
          meta={contract.meta}
          contract={contract}
          onOpenChat={() => setSidebarOpen(true)}
        />

        {/* Tab Bar — EditableTabBar handles both edit and customer modes */}
        <EditableTabBar
          tabs={TABS}
          activeTab={activeTab}
          onSetTab={setActiveTab}
        />

        {/* Date Range Bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-3 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md text-xs font-medium">
              📅 Rolling 13 months
            </span>
            <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none">
              <option>Monthly</option>
              <option>Weekly</option>
              <option>Quarterly</option>
            </select>
            <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none">
              <option>YoY</option>
              <option>MoM</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div id="dashboard-capture" className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
          {isEditMode && (
            <EditToolbar
              reportId={reportId}
              editState={editState}
              allKpiLabels={allKpiLabels}
              allTabLabels={TABS}
              allSectionIds={allSectionIds}
            />
          )}

          {activeTab === "Overview" && <A2UIRenderer messages={messages} />}

          {activeTab !== "Overview" && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-sm">
                <strong>{activeTab}</strong> tab — data will be added in the next iteration.
              </p>
            </div>
          )}
        </div>

        <ChatSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          contract={contract}
        />
      </div>
    </EditModeProvider>
  );
}
