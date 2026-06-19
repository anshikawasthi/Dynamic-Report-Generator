"use client";

import React, { useMemo } from "react";
import type {
  A2UIMessage,
  A2UIComponent,
  A2UIValue,
  SurfaceState,
} from "@/lib/a2ui-types";
import { CATALOG } from "@/lib/catalog";
import { useEditMode } from "./EditModeContext";
import EditableKpiCard from "@/components/dashboard/EditableKpiCard";
import EditableAtRiskTable from "@/components/dashboard/EditableAtRiskTable";
import EditableAssetDetailCard from "@/components/dashboard/EditableAssetDetailCard";
import EditableComponentWrapper from "@/components/edit/EditableComponentWrapper";
import SortableKpiGrid from "@/components/dashboard/SortableKpiGrid";
import SortableSectionList from "@/components/dashboard/SortableSectionList";
import SortableSectionWrapper from "@/components/dashboard/SortableSectionWrapper";

// Section-level components that support visibility toggle + chart-type override
const SECTION_COMPONENTS = new Set([
  "KpiGrid",
  "ServiceTrendChart",
  "RiskTable",
  "ComplianceSummaryBanner",
  "AssetDetailGrid",
]);

// ---------------------------------------------------------------------------
// JSON Pointer resolution (RFC 6901)
// Resolves a path like "/kpis/0/value" against a data model object.
// The special path "/" returns the entire model (used in template scopes
// to pass the current array item as a whole object).
// ---------------------------------------------------------------------------
function resolvePath(
  globalModel: Record<string, unknown>,
  path: string,
  scopedModel?: unknown
): unknown {
  // "/" or "" → return the current scope (whole item in a template)
  if (path === "/" || path === "") {
    return scopedModel !== undefined ? scopedModel : globalModel;
  }

  // Paths starting with "/" navigate from the global data model.
  // Paths that don't start with "/" navigate from the scoped model first.
  const root: unknown =
    scopedModel !== undefined && !path.startsWith("/")
      ? scopedModel
      : globalModel;

  const parts = path.replace(/^\//, "").split("/");
  let current: unknown = root;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// Resolve a single A2UIValue (path ref or literal) to a plain JS value.
function resolveValue(
  value: A2UIValue,
  globalModel: Record<string, unknown>,
  scopedModel?: unknown
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") {
    if ("path" in (value as object))
      return resolvePath(globalModel, (value as { path: string }).path, scopedModel);
    if ("literalString" in (value as object))
      return (value as { literalString: string }).literalString;
    if ("literalNumber" in (value as object))
      return (value as { literalNumber: number }).literalNumber;
    if ("literalBool" in (value as object))
      return (value as { literalBool: boolean }).literalBool;
  }
  return value; // already a plain value
}

// Resolve all props of a component definition.
function resolveProps(
  props: Record<string, A2UIValue> | undefined,
  globalModel: Record<string, unknown>,
  scopedModel?: unknown
): Record<string, unknown> {
  if (!props) return {};
  return Object.fromEntries(
    Object.entries(props).map(([k, v]) => [
      k,
      resolveValue(v, globalModel, scopedModel),
    ])
  );
}

// ---------------------------------------------------------------------------
// RenderNode — recursively renders one component from the surface
// ---------------------------------------------------------------------------
interface RenderNodeProps {
  componentId: string;
  components: Record<string, A2UIComponent>;
  globalModel: Record<string, unknown>;
  scopedModel?: unknown;
  /** Extra props to merge into the component — used to pass componentId to KPI cards */
  extraProps?: Record<string, unknown>;
}

function RenderNode({
  componentId,
  components,
  globalModel,
  scopedModel,
  extraProps,
}: RenderNodeProps) {
  const def = components[componentId];
  if (!def) {
    console.warn(`A2UI: component id "${componentId}" not found in surface`);
    return null;
  }

  const { isEditMode, editState } = useEditMode();

  // Customer-facing visibility: skip sections that the FSM hid
  if (
    SECTION_COMPONENTS.has(def.component) &&
    !isEditMode &&
    !editState.visibleComponents.has(def.id)
  ) {
    return null;
  }

  // Component swaps — editable wrappers are used in BOTH edit and customer mode
  // because they handle visibility filtering in both modes.
  let Comp: React.ComponentType<Record<string, unknown>> | undefined;
  if (def.component === "KpiCard") {
    Comp = EditableKpiCard as unknown as React.ComponentType<Record<string, unknown>>;
  } else if (def.component === "RiskTable") {
    Comp = EditableAtRiskTable as unknown as React.ComponentType<Record<string, unknown>>;
  } else if (def.component === "AssetDetailCard") {
    Comp = EditableAssetDetailCard as unknown as React.ComponentType<Record<string, unknown>>;
  } else {
    Comp = CATALOG[def.component] as React.ComponentType<Record<string, unknown>> | undefined;
  }
  if (!Comp) {
    console.warn(`A2UI: "${def.component}" is not registered in the catalog`);
    return null;
  }

  // Resolve props
  let resolvedProps = resolveProps(def.props, globalModel, scopedModel);

  // Inject visibleSeriesKeys for TrendChart (applies in both edit + customer mode)
  if (def.component === "ServiceTrendChart") {
    const seriesSet = editState.visibleSeries[def.id];
    const allYKeys = (resolvedProps.presentation as Record<string, unknown> | undefined)
      ?.yAxisKeys as string[] | undefined;
    if (seriesSet && allYKeys) {
      resolvedProps = { ...resolvedProps, visibleSeriesKeys: Array.from(seriesSet) };
    }
  }

  // Resolve children
  let children: React.ReactNode = undefined;
  // For KpiGrid: track ordered KPI labels for SortableKpiGrid
  let kpiGridItemIds: string[] = [];

  // ROOT COLUMN EARLY RETURN — apply sectionOrder and wrap in sortable context in edit mode
  if (componentId === "root" && def.children && "explicitList" in def.children) {
    let orderedIds = [...def.children.explicitList];
    if (editState.sectionOrder.length > 0) {
      const orderMap = new Map(editState.sectionOrder.map((id, i) => [id, i]));
      orderedIds.sort((a, b) => (orderMap.get(a) ?? 999) - (orderMap.get(b) ?? 999));
    }
    const sectionNodes = orderedIds.map((sectionId) => (
      <RenderNode
        key={sectionId}
        componentId={sectionId}
        components={components}
        globalModel={globalModel}
        scopedModel={scopedModel}
      />
    ));
    if (isEditMode) {
      return (
        <SortableSectionList sectionIds={orderedIds}>
          {orderedIds.map((sectionId, i) => (
            <SortableSectionWrapper key={sectionId} sectionId={sectionId}>
              {sectionNodes[i]}
            </SortableSectionWrapper>
          ))}
        </SortableSectionList>
      );
    }
    return <div className="space-y-6">{sectionNodes}</div>;
  }

  if (def.children) {
    if ("explicitList" in def.children) {
      // General explicitList (non-root columns, asset grids, etc.)
      children = def.children.explicitList.map((childId) => (
        <RenderNode
          key={childId}
          componentId={childId}
          components={components}
          globalModel={globalModel}
          scopedModel={scopedModel}
        />
      ));
    } else if ("template" in def.children) {
      const { dataBinding, componentId: templateId } = def.children.template;
      const items = resolvePath(globalModel, dataBinding, scopedModel);
      if (Array.isArray(items)) {
        // KpiGrid uses a template — apply kpiOrder reordering by KPI label
        let orderedItems = [...items];
        if (def.component === "KpiGrid") {
          if (editState.kpiOrder.length > 0) {
            const orderMap = new Map(editState.kpiOrder.map((label, i) => [label, i]));
            orderedItems = [...items].sort(
              (a, b) =>
                (orderMap.get((a as Record<string, unknown>).label as string) ?? 999) -
                (orderMap.get((b as Record<string, unknown>).label as string) ?? 999)
            );
          }
          kpiGridItemIds = orderedItems.map((item) => (item as Record<string, unknown>).label as string);
        }
        children = orderedItems.map((item) => {
          const itemKey =
            def.component === "KpiGrid"
              ? ((item as Record<string, unknown>).label as string)
              : String(items.indexOf(item as never));
          return (
            <RenderNode
              key={itemKey}
              componentId={templateId}
              components={components}
              globalModel={globalModel}
              scopedModel={item}
              extraProps={
                def.component === "KpiGrid"
                  ? { componentId: (item as Record<string, unknown>).label as string }
                  : undefined
              }
            />
          );
        });
      }
    }
  }

  const rendered = React.createElement(
    Comp as React.ComponentType<Record<string, unknown>>,
    { ...resolvedProps, ...(extraProps ?? {}) },
    children
  );

  // Edit mode: for KpiGrid swap to SortableKpiGrid so cards are draggable
  if (def.component === "KpiGrid" && isEditMode) {
    return (
      <SortableKpiGrid itemIds={kpiGridItemIds}>
        {children}
      </SortableKpiGrid>
    );
  }

  // Edit mode: wrap section-level components with the hover control strip
  if (SECTION_COMPONENTS.has(def.component) && isEditMode) {
    // For TrendChart, pass yAxisKeys so series toggles render in the strip
    const seriesKeys = def.component === "ServiceTrendChart"
      ? ((resolvedProps.presentation as Record<string, unknown> | undefined)
          ?.yAxisKeys as string[] | undefined)
      : undefined;
    return (
      <EditableComponentWrapper
        componentId={def.id}
        label={def.component}
        seriesKeys={seriesKeys}
      >
        {rendered}
      </EditableComponentWrapper>
    );
  }

  return rendered;
}

// ---------------------------------------------------------------------------
// A2UIRenderer — public entry point
// Processes a list of A2UI messages into a surface state, then renders it.
// ---------------------------------------------------------------------------
interface A2UIRendererProps {
  messages: A2UIMessage[];
}

export default function A2UIRenderer({ messages }: A2UIRendererProps) {
  // Build surface state by replaying the message sequence
  const surface = useMemo<SurfaceState | null>(() => {
    const state: Partial<SurfaceState> & {
      components: Record<string, A2UIComponent>;
      dataModel: Record<string, unknown>;
    } = {
      components: {},
      dataModel: {},
    };

    for (const msg of messages) {
      if ("createSurface" in msg) {
        state.surfaceId = msg.createSurface.surfaceId;
        state.catalogId = msg.createSurface.catalogId;
      } else if ("updateComponents" in msg) {
        for (const comp of msg.updateComponents.components) {
          state.components[comp.id] = comp;
        }
        state.rootId = msg.updateComponents.root;
      } else if ("updateDataModel" in msg) {
        Object.assign(state.dataModel, msg.updateDataModel.value);
      }
    }

    if (!state.surfaceId || !state.rootId) return null;
    return state as SurfaceState;
  }, [messages]);

  if (!surface) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        No A2UI surface to render.
      </div>
    );
  }

  return (
    <RenderNode
      componentId={surface.rootId}
      components={surface.components}
      globalModel={surface.dataModel}
    />
  );
}
