// A2UI v0.9 Protocol Types
// Mirrors the messages produced by backend/services/a2ui_builder.py

// --- Values ---
// A property value is either a path reference into the data model,
// a literal, or a plain already-resolved value.
export type A2UIValue =
  | { path: string }           // resolved from data model via JSON Pointer
  | { literalString: string }  // fixed string
  | { literalNumber: number }  // fixed number
  | { literalBool: boolean }   // fixed boolean
  | unknown;                   // plain value (already resolved)

// --- Component Definitions ---
export interface A2UIComponent {
  id: string;
  component: string; // catalog key e.g. "KpiCard", "ServiceTrendChart"
  props?: Record<string, A2UIValue>;
  children?:
    | { explicitList: string[] }                                      // static list of child IDs
    | { template: { dataBinding: string; componentId: string } };    // dynamic: one instance per array item
}

// --- Messages ---
export interface CreateSurfaceMessage {
  version: string;
  createSurface: {
    surfaceId: string;
    catalogId: string;
  };
}

export interface UpdateComponentsMessage {
  version: string;
  updateComponents: {
    surfaceId: string;
    root: string;                    // ID of the root component to render
    components: A2UIComponent[];
  };
}

export interface UpdateDataModelMessage {
  version: string;
  updateDataModel: {
    surfaceId: string;
    value: Record<string, unknown>;  // the full data model for this surface
  };
}

export type A2UIMessage =
  | CreateSurfaceMessage
  | UpdateComponentsMessage
  | UpdateDataModelMessage;

// --- Surface State (built by the renderer from messages) ---
export interface SurfaceState {
  surfaceId: string;
  catalogId: string;
  components: Record<string, A2UIComponent>; // id → component def
  dataModel: Record<string, unknown>;        // resolved data
  rootId: string;
}

// --- API Response Shape ---
// The /api/reports/{id}/a2ui endpoint returns both messages and the original
// contract (needed for export buttons and header chrome).
import type { UniversalContract, ReportCustomization } from "./types";

export interface ReportA2UIResponse {
  messages: A2UIMessage[];
  contract: UniversalContract;
  customization: ReportCustomization | null;
}
