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


def scan_openai_provider(p: dict, date: str) -> tuple[str, dict]:
    out = ART / f"{p['id']}-scan-{date}.json"
    rank = ART / f"{p['id']}-ranked-{date}.json"

    # Some public endpoints block GET /models (e.g. Cloudflare 1010). If blocked,
    # the config should supply a manual allowlist under `models`.
    cmd = [
        sys.executable,
        str(SCAN),
        "--provider",
        p["id"],
        "--base-url",
        p["baseUrl"],
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

    # Print human summary
    lines = [f"Daily model scan ({date} UTC)"]
    for pid, meta in results:
        lines.append(f"- {pid}: rc={meta['rc']}")
        if meta["rc"] != 0:
            lines.append("  last log:")
            for ln in meta["log"].splitlines()[-6:]:
                lines.append(f"    {ln}")

    # Also include top-ranked models for each provider (if rank files exist)
    for p in providers:
        rank_path = ART / f"{p['id']}-ranked-{date}.json"
        if rank_path.exists():
            rj = json.loads(rank_path.read_text("utf-8"))
            ranked = rj.get("ranked", [])
            if ranked:
                lines.append(f"- {p['id']} ranked(ok) top: {ranked[:10]}")
            else:
                lines.append(f"- {p['id']} ranked(ok): (none)")

    mm_rank = ART / f"minimax-cn-ranked-{date}.json"
    if mm_rank.exists():
        rj = json.loads(mm_rank.read_text("utf-8"))
        ranked = rj.get("ranked", [])
        lines.append(f"- minimax-cn ranked(ok): {ranked}")

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
