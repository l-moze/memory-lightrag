# ARCHITECTURE — OpenClaw TTS Bridge

## Overview
A sidecar HTTP service that implements **OpenAI Audio Speech API** compatible surface for OpenClaw, and routes to pluggable backends.

```
OpenClaw Gateway (tts.openai)  --->  Bridge (POST /v1/audio/speech)
                                         |
                                         +--> DashScope Qwen Realtime WS
                                         +--> (future) Murmr HTTP
                                         +--> (future) other TTS
```

## External API (for OpenClaw)
Implement minimal subset of OpenAI TTS:
- `POST /v1/audio/speech`
  - Accept JSON: `{ model, input, voice, format, speed }` (ignore extras)
  - Return audio bytes with correct `Content-Type`

Auth:
- Require `Authorization: Bearer <bridge_token>`.
- Configure OpenClaw `messages.tts.openai.apiKey` to that token.

## Internal plugin model
- `Adapter` interface: `synthesize({model, voice, text, format, sampleRate}) -> AudioBuffer`
- Registry maps `model` prefix or explicit route to adapter.

## DashScope Qwen realtime adapter
- WS URL derived from region + `?model=<dashscope_model>`.
- On connect:
  - send `session.update` with `mode`, `voice`, `language_type`, `response_format: pcm`, `sample_rate: 24000`.
- For request:
  - send `input_text_buffer.append(text)` then `input_text_buffer.commit`
  - collect `response.audio.delta` base64 chunks -> PCM bytes
  - stop on `response.done`

## Audio output strategy
- **v1**: return WAV (PCM + WAV header). Works widely, but Telegram voice bubble may not appear.
- **v2**: encode to Opus/OGG for Telegram; MP3 for others.
  - Prefer `ffmpeg` installed on host for reliability.
  - If avoiding ffmpeg, use Node libraries (more risk/maintenance).

## Observability
- `/healthz` basic
- structured logs: request_id, provider, model, latency (connect/first_audio/total), bytes
- metrics counters: success/fail per adapter, 4xx/5xx upstream

## Failure & fallback
- timeouts and circuit breaker per adapter
- on failure: return 503 so OpenClaw can fall back to other configured providers or send text

## Security
- Keys stored only in bridge env (DASHSCOPE_API_KEY, MURMR_API_KEY, ...)
- Never log bearer tokens or raw audio.
- Optional allowlist of outbound hosts.
