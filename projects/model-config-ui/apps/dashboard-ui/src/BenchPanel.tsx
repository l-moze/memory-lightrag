import React, { useMemo, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import * as S from "./styles";
import { createRun } from "./api";
import type { SiteEntry } from "./types";

type Point = { attempt: number; ttftMs?: number; totalMs?: number; tps?: number };

type BenchPanelProps = {
  token: string;
  stableSites: SiteEntry[];
  publicSites: SiteEntry[];
  modelIds: string[];
};

export function BenchPanel(props: BenchPanelProps) {
  const [status, setStatus] = useState<string>("");
  const [points, setPoints] = useState<Point[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const [siteId, setSiteId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [repeat, setRepeat] = useState<number>(1);
  const [message, setMessage] = useState<string>("");

  const headers = useMemo(() => {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (props.token) h["authorization"] = `Bearer ${props.token}`;
    return h;
  }, [props.token]);

  const siteOptions = useMemo(() => {
    const stable = props.stableSites.map((s) => ({ group: "稳定站点", ...s }));
    const pub = props.publicSites.map((s) => ({ group: "公益站点", ...s }));
    return [...stable, ...pub];
  }, [props.stableSites, props.publicSites]);

  const modelOptions = props.modelIds;

  const canStart = Boolean(siteId && modelId && message.trim() && repeat > 0);

  async function start() {
    if (!canStart) {
      setStatus("请填写完整的测速参数。");
      return;
    }

    setStatus("正在创建测速任务...");
    setPoints([]);

    let data;
    try {
      data = await createRun(headers, {
        presetId: "ui",
        overrides: {
          siteId,
          modelId,
          repeat,
          messages: [{ role: "user", content: message.trim() }],
        },
      });
    } catch (e) {
      setStatus(`启动失败：${String(e)}`);
      return;
    }
    setStatus(`任务已创建：${data.runId}，正在监听结果...`);

    try {
      esRef.current?.close();
      const es = new EventSource(data.sseUrl);
      esRef.current = es;

      es.addEventListener("run.error", (ev: MessageEvent) => {
        try {
          const parsed = JSON.parse(ev.data);
          const msg = parsed?.data?.message || ev.data;
          setStatus(`运行失败：${msg}`);
        } catch {
          setStatus(`运行失败：${ev.data}`);
        }
      });

      es.addEventListener("metric.sample", (ev: MessageEvent) => {
        try {
          const parsed = JSON.parse(ev.data);
          const m = parsed?.data;
          setPoints((p) =>
            p.concat([
              {
                attempt: Number(m?.attempt ?? p.length + 1),
                ttftMs: m?.ttftMs,
                totalMs: m?.totalMs,
                tps: m?.tps,
              },
            ])
          );
        } catch {
          // ignore
        }
      });

      es.addEventListener("run.status", (ev: MessageEvent) => {
        try {
          const parsed = JSON.parse(ev.data);
          const st = parsed?.data?.status;
          if (st) setStatus(`状态：${st}`);
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        setStatus("SSE 连接异常，请检查网关与插件日志。");
      };
    } catch (e) {
      setStatus(`SSE 初始化失败：${String(e)}`);
    }
  }

  return (
    <div style={{ ...S.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>性能测速</div>
        <button style={S.primaryButton} onClick={start} disabled={!canStart}>
          开始测速
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>选择站点</div>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            style={{ ...S.input, width: "100%" }}
          >
            <option value="">请选择站点</option>
            {["稳定站点", "公益站点"].map((group) => (
              <optgroup key={group} label={group}>
                {siteOptions
                  .filter((s) => s.group === group)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>选择模型</div>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            style={{ ...S.input, width: "100%" }}
          >
            <option value="">请选择模型</option>
            {modelOptions.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>重复次数</div>
          <input
            type="number"
            value={repeat}
            min={1}
            max={100}
            onChange={(e) => setRepeat(Math.max(1, Number(e.target.value || 1)))}
            style={{ ...S.input, width: "100%" }}
          />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>消息内容</div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            width: "100%",
            minHeight: 90,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            padding: 10,
            fontSize: 13,
          }}
        />
      </div>

      {status ? <div style={{ ...S.muted, fontSize: 12, marginTop: 8 }}>{status}</div> : null}

      <div style={{ height: 240, marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="attempt" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="ttftMs" stroke="#2563eb" dot={false} name="TTFT(ms)" />
            <Line type="monotone" dataKey="totalMs" stroke="#16a34a" dot={false} name="Total(ms)" />
            <Line type="monotone" dataKey="tps" stroke="#f59e0b" dot={false} name="TPS" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
    </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
