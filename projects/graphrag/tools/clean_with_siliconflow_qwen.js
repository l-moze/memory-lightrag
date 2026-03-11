#!/usr/bin/env node
/**
 * Clean Markdown files using SiliconFlow OpenAI-compatible /chat/completions.
 *
 * Does NOT modify OpenClaw provider configs.
 * Reads API key from env var SILICONFLOW_API_KEY.
 *
 * Usage:
 *   SILICONFLOW_API_KEY=... node clean_with_siliconflow_qwen.js \
 *     --inDir projects/graphrag/docs/papers_md \
 *     --outDir projects/graphrag/docs/papers_clean \
 *     --model Qwen/Qwen2.5-7B-Instruct \
 *     --baseUrl https://api.siliconflow.cn/v1 \
 *     --promptFile projects/graphrag/prompts/clean_md_llama8b.md
 */

const fs = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v && !v.startsWith('--')) {
        args[k] = v;
        i++;
      } else {
        args[k] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeModelOutput(s) {
  let out = String(s || '').trim();
  const markers = [
    'Here is the cleaned Markdown:',
    "Here's the cleaned Markdown:",
    'Below is the cleaned Markdown:',
  ];
  for (const m of markers) {
    const idx = out.indexOf(m);
    if (idx !== -1) out = out.slice(idx + m.length).trim();
  }
  const lines = out.split(/\r?\n/);
  let start = 0;
  while (start < lines.length) {
    const line = lines[start].trim();
    if (!line) { start++; continue; }
    if (/^(#|\*|-|\d+\.|\[|---|[A-Za-z0-9])/u.test(line)) break;
    start++;
  }
  out = lines.slice(start).join('\n').trim();
  return out ? (out.endsWith('\n') ? out : out + '\n') : '';
}

async function callChat({ baseUrl, apiKey, model, systemPrompt, userText }) {
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
  const payload = {
    model,
    temperature: 0,
    max_tokens: 2500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ]
  };

  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      const retryable = [429, 500, 502, 503, 504].includes(res.status);
      if (retryable && attempt < maxAttempts) {
        const backoff = Math.min(30000, 1000 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 500);
        console.error(`retryable HTTP ${res.status} attempt ${attempt}/${maxAttempts}; sleep ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
    }

    const j = JSON.parse(text);
    const content = j?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in response');
    return normalizeModelOutput(content);
  }

  throw new Error('Exhausted retries');
}

async function listMdFiles(inDir) {
  const entries = await fs.readdir(inDir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map(e => path.join(inDir, e.name))
    .sort();
}

function approxTokens(text) {
  // Very rough: for mixed zh/en markdown this is usually within 2-3x.
  return Math.ceil((text || '').length / 4);
}

function splitIntoSegments(text, maxChars) {
  const lines = String(text || '').split(/\r?\n/);
  const segs = [];
  let cur = [];
  let curLen = 0;

  const flush = () => {
    const t = cur.join('\n').trim();
    if (t) segs.push(t);
    cur = [];
    curLen = 0;
  };

  for (const line of lines) {
    const addLen = line.length + 1;
    if (curLen + addLen > maxChars && curLen > 0) flush();
    cur.push(line);
    curLen += addLen;
  }
  flush();
  return segs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inDir = args.inDir;
  const outDir = args.outDir;
  const model = args.model || 'Qwen/Qwen2.5-7B-Instruct';
  const baseUrl = args.baseUrl || 'https://api.siliconflow.cn/v1';
  const promptFile = args.promptFile;

  if (!inDir || !outDir || !promptFile) {
    console.error('Missing required args: --inDir, --outDir, --promptFile');
    process.exit(2);
  }

  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    console.error('Missing env SILICONFLOW_API_KEY');
    process.exit(2);
  }

  const systemPrompt = await fs.readFile(promptFile, 'utf8');
  await ensureDir(outDir);

  const files = await listMdFiles(inDir);
  if (files.length === 0) {
    console.error(`No .md files found in ${inDir}`);
    process.exit(1);
  }

  // Token budget: keep input well under 32768 for Qwen2.5-7B.
  // We approximate tokens by chars/4 and keep generous margin.
  const MAX_INPUT_TOKENS = 24000;
  const MAX_SEG_CHARS = MAX_INPUT_TOKENS * 4; // rough

  for (const fp of files) {
    const name = path.basename(fp);
    const outPath = path.join(outDir, name);

    // resume-friendly
    try {
      await fs.access(outPath);
      console.error(`skip (exists): ${name}`);
      continue;
    } catch {}

    const raw = await fs.readFile(fp, 'utf8');

    const segs = splitIntoSegments(raw, MAX_SEG_CHARS);
    console.error(`segments: ${name} -> ${segs.length}`);

    const cleanedSegs = [];
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const estTok = approxTokens(seg);
      if (estTok > MAX_INPUT_TOKENS * 1.2) {
        console.error(`warn: segment ${i+1}/${segs.length} still large (estTok=${estTok}), may fail`);
      }

      const userText = [
        `CLEAN THIS MARKDOWN INPUT (PART ${i+1}/${segs.length}).`,
        'Rules: output ONLY cleaned Markdown for this part, no preamble, do not add content, preserve headings/lists/code.',
        'INPUT_START',
        seg,
        'INPUT_END'
      ].join('\n');

      const cleaned = await callChat({ baseUrl, apiKey, model, systemPrompt, userText });
      cleanedSegs.push(cleaned.trimEnd());
      // small pause to reduce rate limits
      await sleep(300);
    }

    const finalText = cleanedSegs.join('\n\n');
    await fs.writeFile(outPath, finalText.endsWith('\n') ? finalText : finalText + '\n', 'utf8');
    console.error(`cleaned: ${name} -> ${path.relative(process.cwd(), outPath)}`);
  }
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
