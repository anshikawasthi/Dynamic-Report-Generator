// Universal Contract — mirrors backend models/contract.py
// This is the single shared data shape between FastAPI and the React frontend.

export type ChartType = "bar" | "line" | "table";
export type Direction = "up" | "down" | "flat";
export type TargetStatus = "on_track" | "below" | "above";
export type Criticality = "Tier 1" | "Tier 2" | "Tier 3";

export type ReportType = "service_performance" | "compliance" | "assets";

export interface ReportMeta {
  reportId: string;
  reportType: ReportType;
  title: string;
  customerName: string;
  contractId: string;
  contractTier: string;
  serviceName: string;
  generatedAt: string;
}

export interface PresentationConfig {
  recommendedChart: ChartType;
  supportedCharts: string[];
  xAxisKey: string;
  yAxisKeys: string[];
}

export interface FieldSchema {
  type: "date" | "currency" | "percent" | "number" | "string" | "hours";
  label: string;
}

export interface KpiMetric {
  label: string;
  value: string;
  mom: string;
  momDirection: Direction;
  yoy: string;
  yoyDirection: Direction;
  target: string;
  targetStatus: TargetStatus;
  insights: number;
  unit: string;
}

export interface AtRiskAsset {
  id: string;
  name: string;
  assetType: string;
  criticality: Criticality;
  riskScore: number;
  signals: string[]; // hex color strings
  recommendation: string;
  savingsEstimate: string;
  // enriched fields present in assets report
  lastServiceDate?: string;
  estimatedFailureWindow?: string;
  priority?: "High" | "Medium" | "Low";
}

export interface UniversalContract {
  meta: ReportMeta;
  kpis: KpiMetric[];
  presentation: PresentationConfig;
  schema: Record<string, FieldSchema>;
  data: Record<string, string | number>[];
  atRiskAssets: AtRiskAsset[];
}

// Portal types
export interface CreateReportRequest {
  customerName: string;
  contractId: string;
  customerEmail: string;
  reportType: "service_performance" | "compliance" | "assets";
}

// FSM report customization — sent to PATCH /api/reports/{id}/customize
export interface ReportCustomization {
  visibleKpis: string[] | null;
  labelOverrides: Record<string, string>;
  visibleTabs: string[] | null;
  visibleComponents: string[] | null;
  chartTypeOverrides: Record<string, "bar" | "line">;
  fieldLabelOverrides: Record<string, string>;
  visibleSeries: Record<string, string[] | null>; // componentId → list (null = all)
  visibleAssets: string[] | null;               // asset IDs (null = all)
  kpiOrder: string[] | null;                    // KPI label order (null = default)
  tabOrder: string[] | null;                    // tab name order (null = default)
  sectionOrder: string[] | null;                // section component ID order (null = default)
}

export interface CreateReportResponse {
  reportId: string;
  reportUrl: string;
  customerName: string;
  contractId: string;
}
