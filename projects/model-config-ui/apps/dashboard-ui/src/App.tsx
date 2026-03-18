import React, { useEffect, useMemo, useState } from "react";
import { DndBoard } from "./DndBoard";
import { BenchPanel } from "./BenchPanel";
import * as S from "./styles";
import type { UiConfig } from "./types";
import { applyUiConfig, extractUiConfig } from "./uiConfig";
import { API_BASE, getConfig, putConfig } from "./api";
import { jsonPretty } from "./http";

const TOKEN_STORAGE_KEY = "openclaw.gatewayToken";

function readTokenFromHash(): string | null {
  // Support both #token=... and #/path?token=...
  const h = window.location.hash || "";
  const m = h.match(/token=([^&]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

const BUILD_ID = "2026-03-18T12:05Z";

function extractModelIds(cfg: Record<string, unknown> | null): string[] {
  if (!cfg) return [];
  const ids = new Set<string>();
  const anyCfg: any = cfg;

  const providers = anyCfg?.models?.providers;
  if (providers && typeof providers === "object") {
    for (const [providerId, provider] of Object.entries(providers)) {
      const models = (provider as any)?.models;
      if (Array.isArray(models)) {
        for (const m of models) {
          if (m?.id) ids.add(`${providerId}/${m.id}`);
        }
      }
    }
  }

  const fallbacks = anyCfg?.agents?.defaults?.model?.fallbacks;
  if (Array.isArray(fallbacks)) {
    for (const id of fallbacks) if (id) ids.add(String(id));
  }

  const primary = anyCfg?.agents?.defaults?.model?.primary;
  if (primary) ids.add(String(primary));

  return Array.from(ids);
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [raw, setRaw] = useState<string>("{");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("");

  const [cfgObj, setCfgObj] = useState<Record<string, unknown> | null>(null);
  const [uiCfg, setUiCfg] = useState<UiConfig>({ stableSites: [], publicSites: [] });

  const [token, setToken] = useState<string>(() => {
    return readTokenFromHash() || window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  });

  // Persist token once entered (so user doesn't need to set it again)
  useEffect(() => {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }, [token]);

  const headers = useMemo(() => {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (token) h["authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  const modelIds = useMemo(() => extractModelIds(cfgObj), [cfgObj]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getConfig(headers);
      setEtag(data.etag);
      setCfgObj(data.config);
      setUiCfg(extractUiConfig(data.config));
      setRaw(jsonPretty(data.config));
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!etag) {
      setSaveStatus("尚未加载 ETag，请先刷新。");
      return;
    }
    setSaveStatus("保存中...");
    try {
      const parsed = JSON.parse(raw);
      const nextCfg = applyUiConfig(parsed, uiCfg);
      const body = JSON.stringify({ config: nextCfg });
      const { res, txt } = await putConfig(headers, etag, body);
      if (res.status === 409) {
        setSaveStatus(`保存冲突（ETag 不匹配）：${txt}`);
        return;
      }
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}: ${txt}`);
      }
      setSaveStatus("保存成功，正在刷新...");
      await load();
      setSaveStatus("保存成功。多人同时修改时，请以 409 冲突为准刷新后重试。");
    } catch (e) {
      setSaveStatus(`保存失败：${String(e)}`);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const card = S.card;

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <h1 style={S.h1}>模型配置管理</h1>
            <div style={{ ...S.muted, fontSize: 12 }}>构建版本：{BUILD_ID}</div>
            <div style={{ ...S.muted, fontSize: 13 }}>
              同源 UI（Gateway 内置），配置保存采用 ETag + If-Match 乐观锁，支持站点分组拖拽与测速。
            </div>
          </div>
          <div style={{ ...S.muted, fontSize: 12 }}>API 地址：<code>{API_BASE}</code></div>
        </div>

        <div style={{ height: 14 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div style={card}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button style={S.button} onClick={load} disabled={loading}>
                刷新
              </button>
              <button style={S.primaryButton} onClick={save} disabled={loading}>
                保存
              </button>
              <span style={{ fontSize: 12, color: "#6b7280" }}>ETag：{etag ?? "（无）"}</span>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 12, color: "#374151" }}>
                网关 Token（保存到本地浏览器）：
              </label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                style={{
                  ...S.input,
                  flex: 1,
                  minWidth: 320,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12,
                }}
              />
              <button
                style={S.button}
                onClick={() => {
                  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
                  setToken("");
                }}
              >
                清除
              </button>
            </div>
          </div>

          {err ? (
            <pre style={{ ...card, background: "#fef2f2", borderColor: "#fecaca", whiteSpace: "pre-wrap" }}>{err}</pre>
          ) : null}

          <DndBoard
            stableSites={uiCfg.stableSites}
            publicSites={uiCfg.publicSites}
            onChange={(next) => setUiCfg((u) => ({ ...u, ...next }))}
          />

          <BenchPanel token={token} stableSites={uiCfg.stableSites} publicSites={uiCfg.publicSites} modelIds={modelIds} />

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 700 }}>高级：原始 JSON</div>
              <button style={S.button} onClick={() => setShowAdvanced((v) => !v)}>
                {showAdvanced ? "收起" : "展开"}
              </button>
            </div>

            {showAdvanced ? (
              <>
                <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                  openclaw.json（可直接编辑；保存时会带 If-Match）：
                </div>
                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  spellCheck={false}
                  style={{
                    width: "100%",
                    height: 420,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    lineHeight: 1.4,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: 10,
                    marginTop: 8,
                  }}
                />
              </>
            ) : (
              <div style={{ ...S.muted, fontSize: 12, marginTop: 8 }}>
                默认隐藏，避免误改；日常只用站点管理与测速即可。
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: 12, color: "#374151", whiteSpace: "pre-wrap" }}>{saveStatus}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
