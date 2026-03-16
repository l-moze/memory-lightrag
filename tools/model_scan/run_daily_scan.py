#!/usr/bin/env python3
"""Daily model scan runner.

- Scans configured 'public providers' (e.g. daiju)
- Scans MiniMax (Anthropic-compatible)
- Produces artifacts under projects/graphrag/artifacts/
- Prints a concise summary suitable for cron announce delivery.

This script does NOT modify openclaw.json automatically; it only reports.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
import sys
from pathlib import Path

# __file__ = <workspace>/tools/model_scan/run_daily_scan.py
ROOT = Path(__file__).resolve().parents[2]  # workspace root
ART = ROOT / "projects" / "graphrag" / "artifacts"
CFG = ROOT / "tools" / "model_scan" / "public_providers.json"
SCAN = ROOT / "tools" / "model_scan" / "scan_models.py"


def utc_stamp() -> str:
    return dt.datetime.utcnow().strftime("%Y-%m-%d")


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def _subst_env(s: str) -> str:
    # supports "${ENV}" substitution in JSON config
    if s.startswith("${") and s.endswith("}"):
        k = s[2:-1]
        return os.environ.get(k, s)
    return s


def scan_openai_provider(p: dict, date: str) -> tuple[str, dict]:
    out = ART / f"{p['id']}-scan-{date}.json"
    rank = ART / f"{p['id']}-ranked-{date}.json"

    base_url = _subst_env(p["baseUrl"])

    # Some public endpoints block GET /models (e.g. Cloudflare 1010). If blocked,
    # the config should supply a manual allowlist under `models`.
    cmd = [
        sys.executable,
        str(SCAN),
        "--provider",
        p["id"],
        "--base-url",
        base_url,
        "--api",
        "openai",
        "--api-key-env",
        p["apiKeyEnv"],
    ]

    if p.get("modelsEndpoint") == "blocked":
        manual = p.get("models") or []
        cmd += ["--models", ",".join(manual)]
    else:
        cmd += ["--fetch-models"]

    cmd += [
        "--out",
        str(out),
        "--rank-out",
        str(rank),
    ]
    cp = run(cmd)
    meta = {"cmd": " ".join(cmd), "rc": cp.returncode, "log": cp.stdout[-1200:]}
    return (p["id"], meta)


def scan_minimax(date: str) -> tuple[str, dict]:
    out = ART / f"minimax-cn-scan-{date}.json"
    rank = ART / f"minimax-cn-ranked-{date}.json"
    cmd = [
        sys.executable,
        str(SCAN),
        "--provider",
        "minimax-cn",
        "--base-url",
        "https://api.minimaxi.com/anthropic",
        "--api",
        "anthropic",
        "--api-key-env",
        "MINIMAX_API_KEY",
        "--models",
        "MiniMax-M2.5,MiniMax-M2.5-highspeed",
        "--out",
        str(out),
        "--rank-out",
        str(rank),
    ]
    cp = run(cmd)
    meta = {"cmd": " ".join(cmd), "rc": cp.returncode, "log": cp.stdout[-1200:]}
    return ("minimax-cn", meta)


def main() -> int:
    ART.mkdir(parents=True, exist_ok=True)
    date = utc_stamp()

    cfg = json.loads(CFG.read_text("utf-8"))
    providers = [p for p in cfg.get("providers", []) if p.get("enabled")]

    results: list[tuple[str, dict]] = []

    # Scan public providers
    for p in providers:
        results.append(scan_openai_provider(p, date))

    # Scan minimax
    results.append(scan_minimax(date))

    # 简约中文摘要（会被 Feishu renderMode=card 渲染成卡片）
    lines = [
        f"🧪 模型扫描日报（UTC {date}）",
    ]

    def provider_label(pid: str) -> str:
        if pid == "api-925214":
            return "公益站 api-925214"
        if pid == "minimax-cn":
            return "MiniMax"
        return pid

    # Provider status
    for pid, meta in results:
        status = "✅" if meta["rc"] == 0 else "⚠️"
        lines.append(f"{status} {provider_label(pid)}")
        if meta["rc"] != 0:
            # keep it short; Feishu card should be clean
            tail = meta["log"].splitlines()[-1:]
            for ln in tail:
                lines.append(f"  - 原因：{ln[:120]}")

    # OK model highlights (top)
    def add_rank_line(label: str, rank_path: Path):
        if not rank_path.exists():
            return
        rj = json.loads(rank_path.read_text("utf-8"))
        ranked = rj.get("ranked", [])
        if not ranked:
            return
        # only show a few, keep minimal
        show = ranked[:6]
        lines.append(f"- {provider_label(label)} 可用模型：{', '.join(show)}")

    for p in providers:
        add_rank_line(p["id"], ART / f"{p['id']}-ranked-{date}.json")

    add_rank_line("minimax-cn", ART / f"minimax-cn-ranked-{date}.json")

    lines.append(f"📁 结果目录：{ART}")

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
