#!/usr/bin/env python3
"""Scan models declared in OpenClaw config and produce a recommended ordering.

This is intentionally *config-driven* (no provider probing). It reads
~/.openclaw/openclaw.json and applies heuristic ranking, then prints a patch
suggestion.

Usage:
  python3 scan_openclaw_config.py --config /home/node/.openclaw/openclaw.json
"""

from __future__ import annotations

import argparse
import json
from typing import Dict, List, Tuple


def rank_model_key(key: str) -> Tuple[int, int]:
    s = key.lower()

    # 0 best
    if "codex" in s or "coder" in s:
        tier = 0
    elif "gpt-5.2" in s or "claude" in s or "opus" in s:
        tier = 1
    elif "deepseek-chat" in s or "instruct" in s or "chat" in s:
        tier = 2
    elif "reasoner" in s or "r1" in s:
        tier = 3
    elif "8b" in s or "7b" in s:
        tier = 9
    else:
        tier = 5

    return (tier, -len(key))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="/home/node/.openclaw/openclaw.json")
    args = ap.parse_args()

    cfg = json.load(open(args.config, "r", encoding="utf-8"))
    defaults = cfg.get("agents", {}).get("defaults", {})
    model_cfg = defaults.get("model", {})

    primary = model_cfg.get("primary")
    fallbacks: List[str] = model_cfg.get("fallbacks") or []

    ranked = sorted(fallbacks, key=rank_model_key)

    print("primary:", primary)
    print("fallbacks (current):")
    for m in fallbacks:
        print(" -", m)

    print("\nfallbacks (recommended):")
    for m in ranked:
        print(" -", m)

    if fallbacks != ranked:
        patch = {
            "agents": {
                "defaults": {
                    "model": {"fallbacks": ranked}
                }
            }
        }
        print("\njson patch suggestion (manual merge):")
        print(json.dumps(patch, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
