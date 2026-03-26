/**
 * Volcengine Doubao (openspeech.bytedance.com) TTS V3
 * HTTP SSE Unidirectional
 *
 * Docs:
 * - https://www.volcengine.com/docs/6561/1598757
 *
 * Endpoints:
 * - https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse
 *
 * Common events:
 * - 352 TTSResponse: { code, message, data: <base64 audio chunk> }
 * - 351 TTSSentenceEnd: sentence metadata
 * - 152 SessionFinish: { code: 20000000, ... }
 */

import https from 'node:https';
import http from 'node:http';

const DOUBAO_BASE_URL = process.env.DOUBAO_BASE_URL ?? 'https://openspeech.bytedance.com';

const DOUBAO_APP_ID = process.env.DOUBAO_APP_ID ?? '';
const DOUBAO_ACCESS_KEY = process.env.DOUBAO_ACCESS_KEY ?? ''; // console: access_token
const DOUBAO_RESOURCE_ID = process.env.DOUBAO_RESOURCE_ID ?? 'seed-tts-2.0';

const DOUBAO_SPEAKER = process.env.DOUBAO_SPEAKER ?? 'zh_female_vv_jupiter_bigtts';
const DOUBAO_SAMPLE_RATE = Number.parseInt(process.env.DOUBAO_SAMPLE_RATE ?? '24000', 10);

const TIMEOUT_MS = Number.parseInt(process.env.DOUBAO_TIMEOUT_MS ?? '30000', 10);

function decodeBase64Lenient(s) {
  if (!s) return Buffer.alloc(0);
  return Buffer.from(String(s).trim(), 'base64');
}

function makeRequest({ path, headers, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, DOUBAO_BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        headers
      },
      (res) => resolve({ res })
    );

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(Object.assign(new Error('Request timeout'), { code: 'ETIMEDOUT' }));
    });
    req.write(body);
    req.end();
  });
}

async function readJsonBody(res, limitBytes = 2_000_000) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    res.on('data', (c) => {
      total += c.length;
      if (total > limitBytes) {
        reject(new Error('Response too large'));
        res.destroy();
        return;
      }
      chunks.push(c);
    });
    res.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ _raw: raw });
      }
    });
    res.on('error', reject);
  });
}

/**
 * Minimal SSE parser: emits {event, dataStr} for blocks separated by blank lines.
 */
function parseSseStream(res, { onEvent }) {
  let buf = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    buf += chunk;

    // SSE frames are separated by a blank line.
    for (;;) {
      const idx = buf.indexOf('\n\n');
      if (idx === -1) break;

      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      let event = null;
      const dataLines = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim());
      }
      if (!event && dataLines.length === 0) continue;
      onEvent({ event, dataStr: dataLines.join('\n') });
    }
  });
}

function mapResponseFormatToDoubaoAudioFormat(responseFormat) {
  // Bridge responseFormat: 'opus' | 'mp3' | 'wav'
  if (responseFormat === 'opus') return 'ogg_opus';
  if (responseFormat === 'mp3') return 'mp3';
  if (responseFormat === 'wav') return 'pcm';
  return 'ogg_opus';
}

export async function synthesize({ text, requestId, responseFormat = 'opus' }) {
  if (!DOUBAO_APP_ID) throw new Error('DOUBAO_APP_ID is not set');
  if (!DOUBAO_ACCESS_KEY) throw new Error('DOUBAO_ACCESS_KEY is not set');

  const startedAt = Date.now();
  const audioFormat = mapResponseFormatToDoubaoAudioFormat(responseFormat);

  const payload = {
    user: { uid: requestId || 'openclaw' },
    req_params: {
      text,
      speaker: DOUBAO_SPEAKER,
      audio_params: {
        format: audioFormat,
        sample_rate: DOUBAO_SAMPLE_RATE
      }
    }
  };

  const body = Buffer.from(JSON.stringify(payload));
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    'X-Api-App-Id': DOUBAO_APP_ID,
    'X-Api-Access-Key': DOUBAO_ACCESS_KEY,
    'X-Api-Resource-Id': DOUBAO_RESOURCE_ID,
    ...(requestId ? { 'X-Api-Request-Id': requestId } : {}),
    'Content-Length': String(body.length)
  };

  const { res } = await makeRequest({
    path: '/api/v3/tts/unidirectional/sse',
    headers,
    body,
    timeoutMs: TIMEOUT_MS
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const errBody = await readJsonBody(res);
    throw new Error(`Doubao HTTP error (${res.statusCode}): ${JSON.stringify(errBody).slice(0, 1200)}`);
  }

  const chunks = [];
  let firstAudioDeltaMs = null;
  let finished = false;
  let lastCode = null;
  let lastMessage = null;

  const doneP = new Promise((resolve, reject) => {
    res.on('error', reject);
    res.on('end', resolve);
  });

  parseSseStream(res, {
    onEvent: ({ event, dataStr }) => {
      if (!dataStr) return;

      let obj;
      try {
        obj = JSON.parse(dataStr);
      } catch {
        return;
      }

      if (typeof obj?.code === 'number') lastCode = obj.code;
      if (typeof obj?.message === 'string') lastMessage = obj.message;

      // 352: audio chunk (base64)
      if (String(event).trim() === '352' && typeof obj?.data === 'string' && obj.data) {
        if (firstAudioDeltaMs === null) firstAudioDeltaMs = Date.now() - startedAt;
        chunks.push(decodeBase64Lenient(obj.data));
      }

      // 152: finish
      if (String(event).trim() === '152') {
        finished = true;
      }
    }
  });

  await doneP;

  const upstreamTotalMs = Date.now() - startedAt;
  const audio = Buffer.concat(chunks);

  if (!finished && lastCode !== 20000000) {
    // Stream ended without explicit finish; tolerate if we got audio.
    if (!audio || audio.length === 0) {
      throw new Error(`Doubao stream ended without audio (code=${lastCode} msg=${lastMessage ?? ''})`);
    }
  }

  if (!audio || audio.length === 0) {
    throw new Error(`Doubao produced empty audio (code=${lastCode} msg=${lastMessage ?? ''})`);
  }

  return {
    // If responseFormat=wav, audioFormat=pcm => server wraps to WAV.
    // Otherwise audio is already encoded (ogg_opus or mp3).
    audio,
    audioFormat,
    timings: {
      acquireConnMs: 0,
      firstAudioDeltaMs: firstAudioDeltaMs ?? upstreamTotalMs,
      upstreamTotalMs
    }
  };
}

export function createPool() {
  let ready = true;
  if (!DOUBAO_APP_ID || !DOUBAO_ACCESS_KEY) ready = false;
  return {
    start: async () => {},
    stop: async () => {},
    readyState: () => ready,
    synthesize
  };
}
