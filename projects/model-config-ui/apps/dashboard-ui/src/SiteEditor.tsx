import React, { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import type { SiteEntry } from "./types";
import * as S from "./styles";
import { Modal } from "./Modal";

function normalizeBaseUrl(v: string) {
  return v.trim().replace(/\/+$/, "");
}

export function SiteEditor(props: {
  open: boolean;
  mode: "create" | "edit";
  title: string;
  initial?: SiteEntry;
  onCancel: () => void;
  onSubmit: (entry: SiteEntry) => void;
}) {
  const [name, setName] = useState(props.initial?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(props.initial?.baseUrl ?? "");
  const [apiKeyEnv, setApiKeyEnv] = useState(props.initial?.apiKeyEnv ?? "");
  const [enabled, setEnabled] = useState(props.initial?.enabled ?? true);

  // reset when dialog opens/initial changes
  React.useEffect(() => {
    if (!props.open) return;
    setName(props.initial?.name ?? "");
    setBaseUrl(props.initial?.baseUrl ?? "");
    setApiKeyEnv(props.initial?.apiKeyEnv ?? "");
    setEnabled(props.initial?.enabled ?? true);
  }, [props.open, props.initial]);

  const err = useMemo(() => {
    if (!name.trim()) return "请填写名称";
    if (!normalizeBaseUrl(baseUrl)) return "请填写 Base URL";
    try {
      // allow http(s) only
      const u = new URL(normalizeBaseUrl(baseUrl));
      if (!/^https?:$/.test(u.protocol)) return "Base URL 需为 http/https";
    } catch {
      return "Base URL 格式不正确";
    }
    return "";
  }, [name, baseUrl]);

  return (
    <Modal
      open={props.open}
      title={props.title}
      onClose={props.onCancel}
      footer={
        <>
          <button style={S.button} onClick={props.onCancel}>
            取消
          </button>
          <button
            style={S.primaryButton}
            disabled={!!err}
            onClick={() => {
              if (err) return;
              const next: SiteEntry = {
                id: props.initial?.id ?? nanoid(),
                name: name.trim(),
                baseUrl: normalizeBaseUrl(baseUrl),
                apiKeyEnv: apiKeyEnv.trim() || undefined,
                enabled,
              };
              props.onSubmit(next);
            }}
          >
            {props.mode === "create" ? "添加" : "保存"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>名称</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...S.input, width: "100%" }} placeholder="例如：公益站（yybbwan）" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Base URL</div>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            style={{ ...S.input, width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
            placeholder="https://example.com/v1"
          />
          <div style={{ ...S.muted, fontSize: 12, marginTop: 6 }}>保存时会去掉末尾的 /</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>API Key Env（可选）</div>
          <input
            value={apiKeyEnv}
            onChange={(e) => setApiKeyEnv(e.target.value)}
            style={{ ...S.input, width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111827" }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          启用该站点
        </label>

        {err ? <div style={{ fontSize: 12, color: "#b91c1c" }}>{err}</div> : null}
      </div>
    </Modal>
  );
}

