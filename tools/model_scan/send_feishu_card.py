#!/usr/bin/env python3
"""Send model scan results to Feishu as an *interactive card*.

This script is meant to be called from OpenClaw cron (agentTurn message can
execute this).

It reads latest scan artifacts for today (UTC) and sends a Feishu card via
OpenClaw CLI:
  openclaw message send --channel feishu --target <to> --card <json>

Env:
- FEISHU_TO: required (e.g. user:ou_xxx)
- API_925214_API_KEY: optional (enables api-925214 scan)

Notes:
- We keep the card generator in feishu_card.py reusable.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
from pathlib import Path

from feishu_card import ProviderSummary, build_model_scan_card

WORKSPACE = Path(__file__).resolve().parents[2]
ART = WORKSPACE / "projects" / "graphrag" / "artifacts"


def utc_date() -> str:
    return dt.datetime.utcnow().strftime("%Y-%m-%d")


def read_ranked(provider_id: str, date: str) -> list[str] | None:
    p = ART / f"{provider_id}-ranked-{date}.json"
    if not p.exists():
        return None
    j = json.loads(p.read_text("utf-8"))
    return j.get("ranked") or []


def main() -> int:
    to = os.environ.get("FEISHU_TO")
    if not to:
        raise SystemExit("Missing env FEISHU_TO (e.g. user:ou_...) ")

    date = utc_date()

    summaries: list[ProviderSummary] = []

    # api-925214 (only if key is present)
    if os.environ.get("API_925214_API_KEY"):
        ranked = read_ranked("api-925214", date)
        if ranked is not None:
            summaries.append(ProviderSummary(provider="api-925214", ok_models=ranked, rc=0))
        else:
            summaries.append(
                ProviderSummary(
                    provider="api-925214",
                    ok_models=[],
                    rc=1,
                    note="No ranked artifact found for today; scan may have failed.",
                )
            )
    else:
        summaries.append(
            ProviderSummary(
                provider="api-925214",
                ok_models=[],
                rc=1,
                note="API_925214_API_KEY not set; skipping scan.",
            )
        )

    # minimax-cn
    ranked = read_ranked("minimax-cn", date)
    if ranked is not None:
        summaries.append(ProviderSummary(provider="minimax-cn", ok_models=ranked, rc=0))
    else:
        summaries.append(
            ProviderSummary(
                provider="minimax-cn",
                ok_models=[],
                rc=1,
                note="No ranked artifact found for today; scan may have failed.",
            )
        )

    card = build_model_scan_card(
        title="Daily Model Scan",
        date_utc=date,
        summaries=summaries,
        artifacts_path=str(ART),
    )

    # Send via OpenClaw message API (channel supports --card)
    cmd = [
        "openclaw",
        "message",
        "send",
        "--channel",
        "feishu",
        "--target",
        to,
        "--card",
        json.dumps(card, ensure_ascii=False),
    ]

    cp = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    print(cp.stdout)
    return cp.returncode


if __name__ == "__main__":
    raise SystemExit(main())
