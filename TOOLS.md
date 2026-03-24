# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## API Configuration Notes

### MiniMax API
- **正确配置**：
  - baseUrl: `https://api.minimaxi.com/anthropic`
  - api: `anthropic-messages`
- **测试 endpoint**: `https://api.minimaxi.com/anthropic/v1/messages`
- **需要的 headers**:
  - `x-api-key: <api-key>`
  - `anthropic-version: 2023-06-01`
- **注意**: 不要用 `/v1/chat/completions`（那是 OpenAI 格式）

### daiju API
- **baseUrl**: `https://china.184772.xyz/v1`
- **api**: `openai-responses` 或 `openai-completions`
- **测试 endpoint**: `https://china.184772.xyz/v1/chat/completions`
- **可用模型**: gpt-5.2, llama3.1-8B (已测试)
- **不可用模型**: gpt-5.4, gpt-5.3-codex (返回 unknown provider)

### DeepSeek API
- **baseUrl**: `https://api.deepseek.com`
- **api**: `openai-completions`
- **测试 endpoint**: `https://api.deepseek.com/v1/chat/completions`

---

## Tooling gotchas

### web_fetch "enabled" but unusable
If `tools.allow` is set (restrictive allowlist mode), it overrides default tool availability.
So even when `tools.web.fetch.enabled=true`, the agent still cannot call `web_fetch` unless `tools.allow` includes either:
- `"web_fetch"` (fetch only), or
- `"group:web"` (includes `web_fetch` + `web_search`).

Quick checks:
- `openclaw config get tools.allow`
- `openclaw config get tools.web.fetch`

---

Add whatever helps you do your job. This is your cheat sheet.
