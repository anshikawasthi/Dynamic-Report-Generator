"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";

interface Props {
  sectionId: string;
  children: React.ReactNode;
}

/**
 * Wraps a single dashboard section with drag-to-reorder behaviour.
 * A grip handle appears above the section on hover.
 */
export default function SortableSectionWrapper({ sectionId, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionId });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.85 : undefined,
        position: "relative",
      }}
      className="group/dragsection"
    >
      {/* Drag handle — centred above section, fades in on hover */}
      <div className="flex justify-center mb-1 h-5">
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover/dragsection:opacity-100 transition-opacity
                     cursor-grab active:cursor-grabbing
                     flex items-center gap-1 px-3 py-0.5 rounded-full
                     bg-white border border-gray-200 shadow-sm
                     text-gray-400 hover:text-gray-600 hover:border-gray-300
                     text-[10px] font-medium select-none"
          title="Drag to reorder section"
        >
          <GripHorizontal className="w-3 h-3" />
          <span>drag</span>
        </div>
      </div>
      {children}
    </div>
  );
}
