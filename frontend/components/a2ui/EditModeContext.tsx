"use client";

import { createContext, useContext } from "react";

export interface EditState {
  visibleKpis: Set<string>;
  labelOverrides: Record<string, string>;
  visibleTabs: Set<string>;
  visibleComponents: Set<string>;
  chartTypeOverrides: Record<string, "bar" | "line">;
  fieldLabelOverrides: Record<string, string>;
  visibleSeries: Record<string, Set<string>>;
  visibleAssets: Set<string>;
  kpiOrder: string[];
  tabOrder: string[];
  sectionOrder: string[];
}

export interface EditModeContextValue {
  isEditMode: boolean;
  editState: EditState;
  onToggleKpi: (originalLabel: string) => void;
  onRelabelKpi: (originalLabel: string, newLabel: string) => void;
  onToggleTab: (tab: string) => void;
  onToggleComponent: (componentId: string) => void;
  onSetChartType: (componentId: string, type: "bar" | "line") => void;
  onSetFieldLabel: (originalText: string, newText: string) => void;
  onToggleSeries: (componentId: string, seriesKey: string, allSeriesKeys: string[]) => void;
  onToggleAsset: (assetId: string) => void;
  onReorderKpis: (newOrder: string[]) => void;
  onReorderTabs: (newOrder: string[]) => void;
  onReorderSections: (newOrder: string[]) => void;
}

const EditModeContext = createContext<EditModeContextValue>({
  isEditMode: false,
  editState: {
    visibleKpis: new Set(),
    labelOverrides: {},
    visibleTabs: new Set(),
    visibleComponents: new Set(),
    chartTypeOverrides: {},
    fieldLabelOverrides: {},
    visibleSeries: {},
    visibleAssets: new Set(),
    kpiOrder: [],
    tabOrder: [],
    sectionOrder: [],
  },
  onToggleKpi: () => {},
  onRelabelKpi: () => {},
  onToggleTab: () => {},
  onToggleComponent: () => {},
  onSetChartType: () => {},
  onSetFieldLabel: () => {},
  onToggleSeries: () => {},
  onToggleAsset: () => {},
  onReorderKpis: () => {},
  onReorderTabs: () => {},
  onReorderSections: () => {},
});

export function useEditMode() {
  return useContext(EditModeContext);
}

export const EditModeProvider = EditModeContext.Provider;
