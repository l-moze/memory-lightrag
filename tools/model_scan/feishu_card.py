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
    """简约中文日报卡片（schema 2.0）。"""

    ok = all(s.rc == 0 for s in summaries)
    # 不要用红色，太刺眼；失败用橙色更舒服
    header_color = "green" if ok else "orange"

    def name_map(p: str) -> str:
        if p in ("api-925214", "api.925214", "public", "public-proxy"):
            return "公益站"
        if p in ("minimax-cn", "minimax"):
            return "MiniMax"
        return p

    def status_icon(rc: int) -> str:
        return "✅" if rc == 0 else "⚠️"

    elements: List[Dict[str, Any]] = []

    # 顶部元信息（尽量短）
    elements.append(
        {
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": f"**UTC 日期：** `{date_utc}`\n**结果目录：** `{artifacts_path}`",
            },
        }
    )
    elements.append({"tag": "hr"})

    # 每个 provider 一块：状态 + 可用模型（Top5）+ 备注（最多一行）
    for s in summaries:
        ok_models = s.ok_models[:5]
        ok_text = "，".join(f"`{m}`" for m in ok_models) if ok_models else "（无）"
        note = (s.note or "").strip()
        # 备注最多一行
        if len(note) > 80:
            note = note[:80] + "…"

        elements.append(
            {
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": f"### {status_icon(s.rc)} {name_map(s.provider)}",
                },
            }
        )

        rows = [
            ("状态", "正常" if s.rc == 0 else f"异常（rc={s.rc}）"),
            ("可用模型", ok_text),
        ]
        if note:
            rows.append(("备注", note))
        elements.extend(_kv_fields(rows))
        elements.append({"tag": "hr"})

    # Footer：不写英文提示
    elements.append(
        {
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": "_说明：模型探测做了抽样与超时上限，避免定时任务卡死。_",
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
