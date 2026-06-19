"use client";

import { Eye, EyeOff, GripVertical } from "lucide-react";
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditMode } from "@/components/a2ui/EditModeContext";

interface Props {
  tabs: string[];
  activeTab: string;
  onSetTab: (tab: string) => void;
}

/** Single draggable tab item — must be a separate component so useSortable is called unconditionally. */
function SortableTabItem({
  tab,
  activeTab,
  onSetTab,
}: {
  tab: string;
  activeTab: string;
  onSetTab: (tab: string) => void;
}) {
  const { isEditMode, editState, onToggleTab } = useEditMode();
  const isVisible = editState.visibleTabs.has(tab);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group flex items-center">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500
                   opacity-0 group-hover:opacity-100 transition-opacity pl-1"
        title="Drag to reorder tab"
      >
        <GripVertical className="w-3 h-3" />
      </div>

      <button
        onClick={() => onSetTab(tab)}
        className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
        } ${!isVisible ? "opacity-40 line-through" : ""}`}
      >
        {tab}
      </button>

      {/* Eye toggle */}
      {isEditMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleTab(tab);
          }}
          title={isVisible ? "Hide tab from customer" : "Show tab to customer"}
          className="absolute -top-0.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 z-10"
        >
          {isVisible ? <EyeOff className="w-2.5 h-2.5 text-gray-500" /> : <Eye className="w-2.5 h-2.5 text-gray-500" />}
        </button>
      )}
    </div>
  );
}

export default function EditableTabBar({ tabs, activeTab, onSetTab }: Props) {
  const { isEditMode, editState, onReorderTabs } = useEditMode();

  // Apply saved tab order
  const orderedTabs =
    editState.tabOrder.length > 0
      ? [...tabs].sort(
          (a, b) =>
            (editState.tabOrder.indexOf(a) === -1 ? 999 : editState.tabOrder.indexOf(a)) -
            (editState.tabOrder.indexOf(b) === -1 ? 999 : editState.tabOrder.indexOf(b))
        )
      : tabs;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedTabs.indexOf(active.id as string);
    const newIndex = orderedTabs.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderTabs(arrayMove(orderedTabs, oldIndex, newIndex));
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6">
      <div className="max-w-7xl mx-auto flex gap-0">
        {isEditMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedTabs} strategy={horizontalListSortingStrategy}>
              {orderedTabs.map((tab) => (
                <SortableTabItem key={tab} tab={tab} activeTab={activeTab} onSetTab={onSetTab} />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          orderedTabs.map((tab) => {
            const isVisible = editState.visibleTabs.has(tab);
            if (!isVisible) return null;
            return (
              <button
                key={tab}
                onClick={() => onSetTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

