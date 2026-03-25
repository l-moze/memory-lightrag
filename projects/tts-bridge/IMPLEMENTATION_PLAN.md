# IMPLEMENTATION_PLAN — OpenClaw TTS Bridge

## v1 (1–2h): Minimal bridge, WAV output
- Node.js HTTP server (Fastify/Express)
- `POST /v1/audio/speech`
  - route by `model`:
    - `qwen3-tts-*-realtime*` -> DashScope realtime WS adapter
  - assemble PCM -> WAV
  - return `audio/wav`
- Add `/healthz`
- Config OpenClaw:
  - `messages.tts.provider=openai`
  - `messages.tts.openai.baseUrl=http://127.0.0.1:<port>/v1`
  - `messages.tts.openai.apiKey=<bridge_token>`
  - `messages.tts.openai.model=qwen3-tts-flash-realtime`

## v2 (half-day): Output formats + Telegram-friendly
- Detect channel if OpenClaw passes it (or add query/header convention)
- Add encoding:
  - Telegram: OGG Opus
  - others: MP3
- Add ffmpeg dependency (preferred) and health check for encoder availability

## v3 (1–2 days): Multi-provider testing + routing
- Config-driven provider registry:
  - model -> adapter + params
- Add experimentation:
  - deterministic hashing by chat_id/sessionKey -> A/B voice/model
- Add caching for identical short prompts (optional)
- Add rate-limit + backpressure

## Acceptance tests
- `curl` to bridge returns playable audio
- `openclaw gateway call tts.convert` succeeds when baseUrl points to bridge
- End-to-end: Telegram receives audio attachment; v2: voice bubble appears
