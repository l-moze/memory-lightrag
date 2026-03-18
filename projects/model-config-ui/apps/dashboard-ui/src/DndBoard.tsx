import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SiteEntry } from "./types";
import * as S from "./styles";
import { SiteEditor } from "./SiteEditor";

type ColKey = "stable" | "public";

function arrayMove<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

function findContainer(id: string, stable: SiteEntry[], pub: SiteEntry[]): ColKey | null {
  if (id === "col:stable") return "stable";
  if (id === "col:public") return "public";
  if (stable.some((x) => x.id === id)) return "stable";
  if (pub.some((x) => x.id === id)) return "public";
  return null;
}

function CardItem(props: {
  item: SiteEntry;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    padding: 10,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,0.08)" : undefined,
  };

  const enabled = props.item.enabled ?? true;

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{props.item.name}</div>
          <span
            style={{
              ...S.badge,
              background: enabled ? "#ecfdf5" : "#f3f4f6",
              borderColor: enabled ? "#a7f3d0" : "#e5e7eb",
              color: enabled ? "#065f46" : "#6b7280",
              flexShrink: 0,
            }}
          >
            {enabled ? "启用" : "停用"}
          </span>
        </div>
        <div style={{ ...S.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{props.item.baseUrl}</div>
        {props.item.apiKeyEnv ? <div style={{ ...S.muted, fontSize: 11 }}>密钥变量：{props.item.apiKeyEnv}</div> : null}
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button style={S.tinyButton} onClick={props.onToggle} title="启用/停用">
          {enabled ? "停用" : "启用"}
        </button>
        <button style={S.tinyButton} onClick={props.onEdit}>
          编辑
        </button>
        <button style={{ ...S.tinyButton, borderColor: "#fecaca", color: "#b91c1c" }} onClick={props.onDelete}>
          删除
        </button>
        <button style={S.tinyButton} {...attributes} {...listeners} title="拖拽排序/跨列移动">
          拖拽
        </button>
      </div>
    </div>
  );
}

function Column(props: {
  title: string;
  colKey: ColKey;
  items: SiteEntry[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${props.colKey}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        ...S.card,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 240,
        outline: isOver ? "2px solid #93c5fd" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 800 }}>{props.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ ...S.muted, fontSize: 12 }}>{props.items.length} 个</span>
          <button style={S.tinyButton} onClick={props.onAdd}>
            添加
          </button>
        </div>
      </div>

      <SortableContext items={props.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {props.items.map((item) => (
            <CardItem
              key={item.id}
              item={item}
              onEdit={() => props.onEdit(item.id)}
              onToggle={() => props.onToggle(item.id)}
              onDelete={() => props.onDelete(item.id)}
            />
          ))}
          {props.items.length === 0 ? (
            <div style={{ ...S.muted, fontSize: 12, padding: 10, border: "1px dashed #e5e7eb", borderRadius: 12 }}>
              空列表：可点击“添加”，或从另一列拖拽过来。
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

export function DndBoard(props: {
  stableSites: SiteEntry[];
  publicSites: SiteEntry[];
  onChange: (next: { stableSites: SiteEntry[]; publicSites: SiteEntry[] }) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const [activeId, setActiveId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorCol, setEditorCol] = useState<ColKey>("stable");
  const [editingId, setEditingId] = useState<string | null>(null);

  const allById = useMemo(() => {
    const m = new Map<string, SiteEntry>();
    for (const x of props.stableSites) m.set(x.id, x);
    for (const x of props.publicSites) m.set(x.id, x);
    return m;
  }, [props.stableSites, props.publicSites]);

  const activeItem = activeId ? allById.get(activeId) : null;

  function openCreate(col: ColKey) {
    setEditorMode("create");
    setEditorCol(col);
    setEditingId(null);
    setEditorOpen(true);
  }
  function openEdit(id: string) {
    const col = findContainer(id, props.stableSites, props.publicSites);
    if (!col) return;
    setEditorMode("edit");
    setEditorCol(col);
    setEditingId(id);
    setEditorOpen(true);
  }

  function updateItem(col: ColKey, id: string, updater: (x: SiteEntry) => SiteEntry) {
    const stable = props.stableSites.slice();
    const pub = props.publicSites.slice();
    const arr = col === "stable" ? stable : pub;
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) return;
    arr[idx] = updater(arr[idx]);
    props.onChange({ stableSites: stable, publicSites: pub });
  }

  function deleteItem(col: ColKey, id: string) {
    const stable = props.stableSites.filter((x) => x.id !== id);
    const pub = props.publicSites.filter((x) => x.id !== id);
    props.onChange({ stableSites: stable, publicSites: pub });
  }

  function onDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    setActiveId(null);
    if (!over) return;

    const activeContainer = findContainer(String(active.id), props.stableSites, props.publicSites);
    const overContainer = findContainer(String(over.id), props.stableSites, props.publicSites);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      const arr = activeContainer === "stable" ? props.stableSites : props.publicSites;
      const oldIndex = arr.findIndex((x) => x.id === active.id);
      const newIndex = arr.findIndex((x) => x.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const moved = arrayMove(arr, oldIndex, newIndex);
      props.onChange(
        activeContainer === "stable"
          ? { stableSites: moved, publicSites: props.publicSites }
          : { stableSites: props.stableSites, publicSites: moved }
      );
      return;
    }

    const srcArr = activeContainer === "stable" ? props.stableSites.slice() : props.publicSites.slice();
    const dstArr = overContainer === "stable" ? props.stableSites.slice() : props.publicSites.slice();

    const srcIdx = srcArr.findIndex((x) => x.id === active.id);
    if (srcIdx < 0) return;

    const isOverColumn = String(over.id).startsWith("col:");
    const dstIdx = isOverColumn ? dstArr.length : dstArr.findIndex((x) => x.id === over.id);
    if (dstIdx < 0) return;

    const [moved] = srcArr.splice(srcIdx, 1);
    dstArr.splice(dstIdx, 0, moved);

    props.onChange(
      overContainer === "stable"
        ? { stableSites: dstArr, publicSites: srcArr }
        : { stableSites: srcArr, publicSites: dstArr }
    );
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Column
            title="稳定站点"
            colKey="stable"
            items={props.stableSites}
            onAdd={() => openCreate("stable")}
            onEdit={openEdit}
            onToggle={(id) => updateItem("stable", id, (x) => ({ ...x, enabled: !(x.enabled ?? true) }))}
            onDelete={(id) => {
              if (confirm("确定删除该站点？")) deleteItem("stable", id);
            }}
          />
          <Column
            title="公益站点"
            colKey="public"
            items={props.publicSites}
            onAdd={() => openCreate("public")}
            onEdit={openEdit}
            onToggle={(id) => updateItem("public", id, (x) => ({ ...x, enabled: !(x.enabled ?? true) }))}
            onDelete={(id) => {
              if (confirm("确定删除该站点？")) deleteItem("public", id);
            }}
          />
        </div>

        <DragOverlay>
          {activeItem ? (
            <div style={{ padding: 10, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", width: 360 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{activeItem.name}</div>
              <div style={{ ...S.muted, fontSize: 12 }}>{activeItem.baseUrl}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <SiteEditor
        open={editorOpen}
        mode={editorMode}
        title={editorMode === "create" ? "添加站点" : "编辑站点"}
        initial={editingId ? allById.get(editingId) ?? undefined : undefined}
        onCancel={() => setEditorOpen(false)}
        onSubmit={(entry) => {
          const stable = props.stableSites.slice();
          const pub = props.publicSites.slice();

          if (editorMode === "create") {
            if (editorCol === "stable") stable.unshift(entry);
            else pub.unshift(entry);
          } else {
            const col = editorCol;
            const arr = col === "stable" ? stable : pub;
            const idx = arr.findIndex((x) => x.id === entry.id);
            if (idx >= 0) arr[idx] = entry;
          }

          props.onChange({ stableSites: stable, publicSites: pub });
          setEditorOpen(false);
        }}
      />
    </>
  );
}
