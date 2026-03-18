import React, { useEffect, useRef } from "react";
import * as S from "./styles";

export function Modal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (props.open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [props.open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        props.onClose();
      }}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 0,
        width: props.width ?? 520,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 800 }}>{props.title}</div>
        <button style={{ ...S.button, padding: "6px 10px" }} onClick={props.onClose}>
          关闭
        </button>
      </div>
      <div style={{ padding: 14 }}>{props.children}</div>
      {props.footer ? (
        <div style={{ padding: 14, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {props.footer}
        </div>
      ) : null}
      <style>{`dialog::backdrop{background: rgba(17,24,39,0.35);}`}</style>
    </dialog>
  );
}
