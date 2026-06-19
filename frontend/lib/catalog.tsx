// Service Report Catalog
// Maps A2UI component name strings → actual React components.
// This is the "menu" of what the backend is allowed to request.
// Add new components here as the product grows.

import type { ComponentType } from "react";
import KpiCard from "@/components/dashboard/KpiCard";
import TrendChart from "@/components/dashboard/TrendChart";
import AtRiskTable from "@/components/dashboard/AtRiskTable";
import ComplianceSummaryBanner from "@/components/dashboard/ComplianceSummaryBanner";
import AssetDetailCard from "@/components/dashboard/AssetDetailCard";
import AssetDetailGrid from "@/components/dashboard/AssetDetailGrid";

// ---- Layout primitives ----

function Column({ children }: { children?: React.ReactNode }) {
  // Vertical stack — the root layout container
  return <div className="space-y-6">{children}</div>;
}

function KpiGrid({ children }: { children?: React.ReactNode }) {
  // auto-fit: cards always expand to fill the full row regardless of count
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">{children}</div>
  );
}

// ---- Catalog registry ----
// Keys must exactly match the "component" strings in a2ui_builder.py

export const CATALOG: Record<string, ComponentType<any>> = {
  Column,
  KpiGrid,
  KpiCard,
  ServiceTrendChart: TrendChart,        // TrendChart registered as "ServiceTrendChart"
  RiskTable: AtRiskTable,               // AtRiskTable registered as "RiskTable"
  ComplianceSummaryBanner,              // used by compliance report type
  AssetDetailCard,                      // used by assets report type
  AssetDetailGrid,                      // used by assets report type
};
