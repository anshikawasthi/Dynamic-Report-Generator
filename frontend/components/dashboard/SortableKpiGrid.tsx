"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { useEditMode } from "@/components/a2ui/EditModeContext";

interface Props {
  /** Ordered list of component IDs — dnd-kit uses these as stable item IDs. */
  itemIds: string[];
  children: React.ReactNode;
}

/**
 * Edit-mode KPI grid that wraps children in a DndContext so cards can be
 * dragged to reorder them. Uses the same CSS grid as KpiGrid in the catalog.
 */
export default function SortableKpiGrid({ itemIds, children }: Props) {
  const { onReorderKpis } = useEditMode();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a 5px drag before starting so click events still fire normally
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = itemIds.indexOf(active.id as string);
    const newIndex = itemIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorderKpis(arrayMove(itemIds, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {children}
        </div>
      </SortableContext>
    </DndContext>
  );
}
