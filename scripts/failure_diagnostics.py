#!/usr/bin/env python3
"""Minimal failure diagnostics for OpenClaw logs.

Aggregates recent lane failures by provider/model/error to help triage 403/429/5xx quickly.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional

LINE_RE = re.compile(
    r'^(?P<ts>\S+)\s+\w+\s+[^\n]*lane task error: lane=(?P<lane>[^\s]+)\s+durationMs=\d+\s+error="(?P<err>[^"]+)"'
)

AGENT_LANE_RE = re.compile(r"session:agent:([^:]+):")


@dataclass
class Event:
    ts: str
    lane: str
    agent_id: str
    model: str
    provider: str
    err: str
    category: str


def latest_log(default_glob: str = "/tmp/openclaw/openclaw-*.log") -> Optional[str]:
    files = glob.glob(default_glob)
    if not files:
        return None
    files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return files[0]


def normalize_model(model_cfg) -> str:
    if isinstance(model_cfg, str):
        return model_cfg
    if isinstance(model_cfg, dict):
        primary = model_cfg.get("primary")
        if isinstance(primary, str):
            return primary
    return "unknown"


def model_map(config_path: str) -> Dict[str, str]:
    mp: Dict[str, str] = {}
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except Exception:
        return mp

    defaults_model = normalize_model(((cfg.get("agents") or {}).get("defaults") or {}).get("model"))

    for a in ((cfg.get("agents") or {}).get("list") or []):
        aid = a.get("id")
        if not aid:
            continue
        m = normalize_model(a.get("model"))
        if m == "unknown":
            m = defaults_model
        mp[aid] = m

    mp["__default__"] = defaults_model
    return mp


def provider_from_model(model: str) -> str:
    if "/" in model:
        return model.split("/", 1)[0]
    if ":" in model:
        return model.split(":", 1)[0]
    return "unknown"


def classify(err: str) -> str:
    e = err.lower()
    if "403" in e and "blocked" in e:
        return "blocked_403"
    if "rate limit" in e or "429" in e:
        return "rate_limited"
    if "502" in e or "temporarily unavailable" in e:
        return "upstream_502"
    if "timed out" in e or "timeout" in e:
        return "timeout"
    return "other"


def parse_events(log_path: str, cfg_map: Dict[str, str], limit: int) -> list[Event]:
    out: list[Event] = []
    try:
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                m = LINE_RE.search(line)
                if not m:
                    continue
                lane = m.group("lane")
                err = m.group("err")
                ts = m.group("ts")

                aid = "unknown"
                model = cfg_map.get("__default__", "unknown")
                agent_match = AGENT_LANE_RE.search(lane)
                if agent_match:
                    aid = agent_match.group(1)
                    model = cfg_map.get(aid, model)
                elif lane == "main":
                    aid = "main"
                provider = provider_from_model(model)
                out.append(
                    Event(
                        ts=ts,
                        lane=lane,
                        agent_id=aid,
                        model=model,
                        provider=provider,
                        err=err,
                        category=classify(err),
                    )
                )
    except FileNotFoundError:
        return []

    out.sort(key=lambda e: e.ts, reverse=True)
    return out[:limit]


def fmt_ts(ts: str) -> str:
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%m-%d %H:%M:%S")
    except Exception:
        return ts


def main() -> int:
    ap = argparse.ArgumentParser(description="Aggregate recent OpenClaw lane failures")
    ap.add_argument("--log", default=None, help="Log file path (default: latest /tmp/openclaw/openclaw-*.log)")
    ap.add_argument("--config", default=os.path.expanduser("~/.openclaw/openclaw.json"), help="openclaw.json path")
    ap.add_argument("--limit", type=int, default=80, help="Recent failure events to analyze")
    args = ap.parse_args()

    log_path = args.log or latest_log()
    if not log_path:
        print("No log file found under /tmp/openclaw/openclaw-*.log")
        return 1

    cfg_map = model_map(args.config)
    events = parse_events(log_path, cfg_map, args.limit)
    if not events:
        print(f"No lane failures found in {log_path}")
        return 0

    by_model = Counter((e.provider, e.model, e.category) for e in events)
    by_agent = Counter((e.agent_id, e.category) for e in events)

    print(f"Log: {log_path}")
    print(f"Window: latest {len(events)} lane failures")
    print("\nTop provider/model failures:")
    for (provider, model, cat), n in by_model.most_common(12):
        print(f"- {n:>3}  {provider:12} {model:40} {cat}")

    print("\nTop agent failures:")
    for (aid, cat), n in by_agent.most_common(10):
        print(f"- {n:>3}  {aid:18} {cat}")

    print("\nRecent samples:")
    for e in events[:8]:
        print(f"- {fmt_ts(e.ts)} | {e.agent_id:14} | {e.category:12} | {e.err}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
