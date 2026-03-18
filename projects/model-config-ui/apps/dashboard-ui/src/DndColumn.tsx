import React from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SiteEntry } from "./types";
import * as S from "./styles";

function Item({ item }: { item: SiteEntry }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    padding: 10,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
        <div style={{ ...S.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>{item.baseUrl}</div>
        {item.apiKeyEnv ? (
          <div style={{ ...S.muted, fontSize: 11 }}>Key: {item.apiKeyEnv}</div>
        ) : null}
      </div>
      <button style={{ ...S.button, fontSize: 12 }} {...attributes} {...listeners}>
        拖拽
      </button>
    </div>
  );
}

// Deprecated: kept for reference; MVP-1 uses DndBoard with cross-column drag.
export function DndColumn(props: {
  title: string;
  items: SiteEntry[];
  onChange: (next: SiteEntry[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;
    const oldIndex = props.items.findIndex((i) => i.id === active.id);
    const newIndex = props.items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    props.onChange(arrayMove(props.items, oldIndex, newIndex));
  }

  return (
    <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 700 }}>{props.title}</div>
        <div style={{ ...S.muted, fontSize: 12 }}>{props.items.length} 个</div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={props.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {props.items.map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
