#!/usr/bin/env python3
"""Scan a provider baseUrl for working models and emit a normalized ranking.

Why this exists:
- The previous script (`projects/graphrag/tools/scan_models.py`) was a quick hack:
  - no functions/classes
  - hard-coded OpenAI chat/completions only
  - no retry/backoff
  - writes only /tmp output

This version:
- is importable + testable
- supports OpenAI-compatible *and* Anthropic-compatible endpoints (needed for MiniMax)
- emits JSON artifacts in a stable format

Usage examples:
  python3 scan_models.py --provider daiju --base-url https://api.daiju.live/v1 --api openai --api-key-env DAIJU_API_KEY --models-json models.json
  python3 scan_models.py --provider minimax-cn --base-url https://api.minimaxi.com/anthropic --api anthropic --api-key-env MINIMAX_API_KEY --models "MiniMax-M2.5,MiniMax-M2.5-highspeed"
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Literal, Optional, Tuple

ApiKind = Literal["openai", "anthropic"]


@dataclass
class ModelCheck:
    model: str
    ok: bool
    status: int | str
    ms: int
    info: str


@dataclass
class ScanResult:
    provider: str
    base_url: str
    api: ApiKind
    checked: int
    ok: int
    results: List[ModelCheck]

    def to_json(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "base": self.base_url,
            "api": self.api,
            "count": self.checked,
            "ok": self.ok,
            "results": [dataclasses.asdict(r) for r in self.results],
        }


def _http_json(url: str, headers: Dict[str, str], payload: Dict[str, Any], timeout_s: int = 25) -> Tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        body = resp.read().decode("utf-8", "replace")
        return resp.status, body


def check_model_openai(base_url: str, api_key: str, model: str, timeout_s: int = 25) -> ModelCheck:
    url = base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Reply with exactly: OK"}],
        "max_tokens": 8,
        "temperature": 0,
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    t0 = time.time()
    try:
        status, body = _http_json(url, headers, payload, timeout_s=timeout_s)
        ms = int((time.time() - t0) * 1000)
        return ModelCheck(model=model, ok=True, status=status, ms=ms, info=body[:200].replace("\n", " "))
    except urllib.error.HTTPError as e:
        ms = int((time.time() - t0) * 1000)
        body = e.read().decode("utf-8", "replace")
        return ModelCheck(model=model, ok=False, status=e.code, ms=ms, info=body[:260].replace("\n", " "))
    except Exception as e:
        ms = int((time.time() - t0) * 1000)
        return ModelCheck(model=model, ok=False, status="ERR", ms=ms, info=str(e)[:260])


def check_model_anthropic(base_url: str, api_key: str, model: str, timeout_s: int = 25) -> ModelCheck:
    # Anthropic-compatible messages API
    url = base_url.rstrip("/") + "/v1/messages"
    payload = {
        "model": model,
        "max_tokens": 32,
        "messages": [{"role": "user", "content": "Reply with exactly: OK"}],
    }
    headers = {
        "content-type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    t0 = time.time()
    try:
        status, body = _http_json(url, headers, payload, timeout_s=timeout_s)
        ms = int((time.time() - t0) * 1000)
        return ModelCheck(model=model, ok=True, status=status, ms=ms, info=body[:200].replace("\n", " "))
    except urllib.error.HTTPError as e:
        ms = int((time.time() - t0) * 1000)
        body = e.read().decode("utf-8", "replace")
        return ModelCheck(model=model, ok=False, status=e.code, ms=ms, info=body[:260].replace("\n", " "))
    except Exception as e:
        ms = int((time.time() - t0) * 1000)
        return ModelCheck(model=model, ok=False, status="ERR", ms=ms, info=str(e)[:260])


def scan(provider: str, base_url: str, api: ApiKind, api_key: str, models: Iterable[str], sleep_s: float = 0.25) -> ScanResult:
    results: List[ModelCheck] = []
    for m in models:
        m = m.strip()
        if not m:
            continue
        if api == "openai":
            r = check_model_openai(base_url, api_key, m)
        else:
            r = check_model_anthropic(base_url, api_key, m)
        results.append(r)
        time.sleep(sleep_s + random.random() * 0.05)

    ok = sum(1 for r in results if r.ok)
    return ScanResult(provider=provider, base_url=base_url, api=api, checked=len(results), ok=ok, results=results)


def load_models_from_openai_models_json(path: str) -> List[str]:
    j = json.load(open(path, "r", encoding="utf-8"))
    # Support either {data:[{id:..}]} or {models:[{id:..}]}
    data = j.get("data") or j.get("models") or []
    out: List[str] = []
    for item in data:
        mid = item.get("id") if isinstance(item, dict) else None
        if mid:
            out.append(str(mid))
    return out


def fetch_openai_models(base_url: str, api_key: str, timeout_s: int = 25) -> List[str]:
    """Fetch model ids from an OpenAI-compatible /models endpoint."""
    url = base_url.rstrip("/") + "/models"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        body = resp.read().decode("utf-8", "replace")
    j = json.loads(body)
    data = j.get("data") or j.get("models") or []
    out: List[str] = []
    for item in data:
        if isinstance(item, dict) and item.get("id"):
            out.append(str(item["id"]))
    return out


def rank_models(models: List[str]) -> List[str]:
    """A simple opinionated ranking.

    Rules:
    - prefer explicit coding models for coding agents (codex, coder)
    - prefer chat/general for conversation
    - keep small/unstable models last

    This is heuristic and should be customized.
    """

    def score(m: str) -> Tuple[int, int]:
        s = m.lower()
        primary = 0
        if "codex" in s or "coder" in s:
            primary = 0
        elif "reasoner" in s or "r1" in s:
            primary = 1
        elif "chat" in s or "instruct" in s:
            primary = 2
        else:
            primary = 3

        # tie-breaker: longer names often indicate specific variants
        return (primary, -len(m))

    return sorted(models, key=score)


def main(argv: List[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--provider", required=True)
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--api", choices=["openai", "anthropic"], required=True)
    ap.add_argument("--api-key-env", required=True)

    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--models-json", help="Path to OpenAI /v1/models response JSON")
    src.add_argument("--models", help="Comma-separated model ids")
    src.add_argument("--fetch-models", action="store_true", help="Fetch model list from GET /models (OpenAI-compatible only)")

    ap.add_argument("--out", help="Write scan JSON to path")
    ap.add_argument("--rank-out", help="Write ranked OK model list JSON to path")
    args = ap.parse_args(argv)

    api_key = os.environ.get(args.api_key_env)
    if not api_key:
        print(f"Missing env var {args.api_key_env}", file=sys.stderr)
        return 2

    if args.fetch_models:
        if args.api != "openai":
            print("--fetch-models requires --api openai", file=sys.stderr)
            return 2
        models = fetch_openai_models(args.base_url, api_key)
    elif args.models_json:
        models = load_models_from_openai_models_json(args.models_json)
    else:
        models = [m.strip() for m in args.models.split(",")]

    res = scan(args.provider, args.base_url, args.api, api_key, models)

    out_obj = res.to_json()
    if args.out:
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        json.dump(out_obj, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    else:
        print(json.dumps(out_obj, ensure_ascii=False, indent=2))

    ok_models = [r.model for r in res.results if r.ok]
    ranked = rank_models(ok_models)

    if args.rank_out:
        os.makedirs(os.path.dirname(args.rank_out) or ".", exist_ok=True)
        json.dump({"provider": args.provider, "ok_models": ok_models, "ranked": ranked}, open(args.rank_out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
