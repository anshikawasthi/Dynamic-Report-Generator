"use client";

import { useState, useRef } from "react";
import type { KpiMetric } from "@/lib/types";
import KpiCard from "./KpiCard";
import { useEditMode } from "@/components/a2ui/EditModeContext";
import { Eye, EyeOff, GripVertical, Pencil } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  kpi: KpiMetric;
  /** Stable A2UI component ID — used as the dnd-kit sortable item ID */
  componentId?: string;
}

export default function EditableKpiCard({ kpi, componentId }: Props) {
  const { isEditMode, editState, onToggleKpi, onRelabelKpi } = useEditMode();
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // dnd-kit sortable — always call the hook (rules of hooks), inactive when no componentId
  const sortableId = componentId ?? kpi.label;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const dragStyle = isEditMode ? {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  } : {};

  // The displayed label may have been overridden by FSM
  const displayLabel = editState.labelOverrides[kpi.label] ?? kpi.label;
  const isVisible = editState.visibleKpis.has(kpi.label);

  const startEdit = () => {
    setLabelInput(displayLabel);
    setEditingLabel(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const confirmEdit = () => {
    const trimmed = labelInput.trim();
    if (trimmed && trimmed !== kpi.label) {
      onRelabelKpi(kpi.label, trimmed);
    }
    setEditingLabel(false);
  };

  const cancelEdit = () => {
    setEditingLabel(false);
  };

  // In customer view, hide invisible KPIs entirely
  if (!isEditMode && !isVisible) return null;

  // Render a modified kpi object with the current display label for KpiCard
  const displayKpi: KpiMetric = { ...kpi, label: displayLabel };

  return (
    <div
      ref={isEditMode ? setNodeRef : undefined}
      style={dragStyle}
      className={`relative group transition-opacity ${isEditMode && !isVisible ? "opacity-40" : ""}`}
    >
      {/* Underlying KPI card */}
      <KpiCard kpi={displayKpi} />

      {/* Edit overlay — only rendered in edit mode */}
      {isEditMode && (
        <div className="absolute inset-0 rounded-xl pointer-events-none">

          {/* Drag handle — top-center, only in edit mode */}
          <div
            {...attributes}
            {...listeners}
            className="absolute top-1.5 left-1/2 -translate-x-1/2 p-0.5 rounded cursor-grab active:cursor-grabbing
                       opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto
                       text-gray-400 hover:text-gray-600"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Visibility toggle — top-right corner */}
          <button
            onClick={() => onToggleKpi(kpi.label)}
            title={isVisible ? "Hide from customer" : "Show to customer"}
            className="absolute top-2 right-2 p-1 rounded-md bg-white/90 border border-gray-200 shadow-sm
                       opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto
                       hover:bg-gray-50 text-gray-500 hover:text-gray-700"
          >
            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-500" />}
          </button>

          {/* Label edit — pencil icon next to label area */}
          {!editingLabel && (
            <button
              onClick={startEdit}
              title="Rename card title"
              className="absolute top-2 left-2 p-1 rounded-md bg-white/90 border border-gray-200 shadow-sm
                         opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto
                         hover:bg-gray-50 text-gray-500 hover:text-gray-700"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Inline label editor — overlays the label area when active */}
      {isEditMode && editingLabel && (
        <div className="absolute inset-0 flex items-start pt-4 px-4 rounded-xl bg-white/95 border-2 border-amber-400 z-10">
          <input
            ref={inputRef}
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            onBlur={confirmEdit}
            autoFocus
            className="w-full text-sm font-medium text-gray-700 bg-transparent border-b-2 border-amber-400
                       focus:outline-none pb-0.5"
            placeholder="Enter label…"
          />
        </div>
      )}

      {/* Hidden badge — edit mode only */}
      {isEditMode && !isVisible && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none">
          <span className="text-xs font-semibold text-red-500 bg-white/80 px-2 py-0.5 rounded-full border border-red-200">
            Hidden from customer
          </span>
        </div>
      )}
    </div>
  );
}
