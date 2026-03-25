# RESEARCH_NOTES — OpenClaw TTS Bridge (DashScope/Qwen Realtime + future providers)

## Goal
Enable OpenClaw auto‑TTS (and `/tts audio`) to use non-native providers such as Alibaba Bailian (DashScope) Qwen3 realtime TTS models, and later plug in additional TTS vendors for A/B testing.

## Key findings

### OpenClaw TTS expects provider plugins (native) or OpenAI/ElevenLabs/Microsoft
- Gateway RPC `tts.convert` uses `textToSpeech(...)` and validates provider ids against registered providers (openai/elevenlabs/microsoft by default).
- OpenAI TTS path uses HTTP `POST {baseUrl}/audio/speech` (OpenAI Audio Speech API shape).

### Telegram voice UX prefers Opus
- OpenClaw docs: Telegram voice note bubble expects Opus; OpenAI/ElevenLabs outputs are fixed; Microsoft format is configurable.

### DashScope Qwen3 TTS Flash Realtime is WebSocket protocol (not OpenAI-compatible)
- Endpoint: `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime` (Beijing) and intl equivalent.
- Auth: `Authorization: Bearer ${DASHSCOPE_API_KEY}`
- Protocol includes events: `session.update`, `input_text_buffer.append`, `input_text_buffer.commit`, streaming `response.audio.delta` (base64 PCM), and `response.done`.

## Implication
Direct configuration of OpenClaw `messages.tts.provider` cannot target DashScope/Qwen realtime. A translation layer is required.

## Proposed approach
Implement an external **TTS Bridge** that exposes an OpenAI-compatible endpoint (`POST /v1/audio/speech`) and internally adapts to:
- DashScope Qwen realtime (WS)
- (later) Murmr, other vendors

The bridge becomes the `messages.tts.openai.baseUrl` target.

## Open questions
- Output formats: Qwen realtime returns PCM; Telegram wants Opus for voice bubble. Need encoding strategy (ffmpeg or codec library).
- Hot reload: whether changing `messages.tts.openai.baseUrl` requires gateway restart in this deployment; may use per-session `/tts provider openai` + config or restart window.
