#!/usr/bin/env python3
"""Reusable Feishu interactive card builder for model scan reports.

Card schema: Feishu interactive card schema 2.0.
We keep the card payload generator pure (no I/O) so it is reusable.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ProviderSummary:
    provider: str
    ok_models: List[str]
    rc: int
    note: Optional[str] = None


def _kv_fields(rows: List[tuple[str, str]]) -> List[Dict[str, Any]]:
    return [
        {
            "tag": "div",
            "fields": [
                {
                    "is_short": True,
                    "text": {"tag": "lark_md", "content": f"**{k}**"},
                },
                {
                    "is_short": False,
                    "text": {"tag": "lark_md", "content": v or "-"},
                },
            ],
        }
        for k, v in rows
    ]


def build_model_scan_card(
    *,
    title: str,
    date_utc: str,
    summaries: List[ProviderSummary],
    artifacts_path: str,
) -> Dict[str, Any]:
    # overall status
    ok = all(s.rc == 0 for s in summaries)
    header_color = "green" if ok else "red"

    elements: List[Dict[str, Any]] = []

    # Meta section
    elements += [
        {
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": f"**Date (UTC):** `{date_utc}`\n**Artifacts:** `{artifacts_path}`",
            },
        },
        {"tag": "hr"},
    ]

    # Provider sections
    for s in summaries:
        status = "✅" if s.rc == 0 else "❌"
        ok_models = s.ok_models[:10]
        ok_text = ", ".join(f"`{m}`" for m in ok_models) if ok_models else "(none)"
        note = s.note or ""
        rows = [
            ("Status", f"{status} rc={s.rc}"),
            ("OK models", ok_text),
        ]
        if note:
            rows.append(("Note", note))

        elements += [
            {
                "tag": "div",
                "text": {"tag": "lark_md", "content": f"### {s.provider}"},
            },
            *_kv_fields(rows),
            {"tag": "hr"},
        ]

    # Footer hint
    elements.append(
        {
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": "_Tip: providers behind Cloudflare may require a browser User-Agent; slow models are sampled and capped to keep cron fast._",
            },
        }
    )

    return {
        "schema": "2.0",
        "config": {"wide_screen_mode": True},
        "header": {
            "title": {"tag": "plain_text", "content": title},
            "template": header_color,
        },
        "body": {"elements": elements},
    }
