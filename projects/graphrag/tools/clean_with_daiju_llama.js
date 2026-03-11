#!/usr/bin/env node
/**
 * Clean Markdown files using daiju OpenAI-compatible /chat/completions.
 *
 * IMPORTANT:
 * - Does NOT touch OpenClaw models.json or any provider config.
 * - Reads API key from env var DAIJU_API_KEY.
 * - If missing, prompts on stdin (best run in a TTY).
 * - Writes outputs to an output directory; never overwrites inputs by default.
 *
 * Usage:
 *   node clean_with_daiju_llama.js \
 *     --inDir projects/graphrag/docs/papers_md \
 *     --outDir projects/graphrag/docs/papers_clean \
 *     --model llama3.1-8B \
 *     --baseUrl https://api.daiju.live/v1 \
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

async function promptHidden(question) {
  // Best-effort hidden prompt in TTY.
  if (!process.stdin.isTTY) throw new Error('DAIJU_API_KEY not set and no TTY to prompt');
  const { stdin, stdout } = process;
  stdout.write(question);
  // Disable echo
  await new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('stty -echo', { stdio: 'inherit' }, () => resolve());
  });
  const key = await new Promise((resolve) => {
    let buf = '';
    stdin.setEncoding('utf8');
    const onData = (d) => {
      buf += d;
      if (buf.includes('\n')) {
        stdin.off('data', onData);
        resolve(buf.trim());
      }
    };
    stdin.on('data', onData);
  });
  // Re-enable echo
  await new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('stty echo', { stdio: 'inherit' }, () => resolve());
  });
  stdout.write('\n');
  return key;
}

async function listMdFiles(inDir) {
  const entries = await fs.readdir(inDir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map(e => path.join(inDir, e.name))
    .sort();
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function normalizeModelOutput(s) {
  let out = String(s || '').trim();

  // Common unwanted preambles from smaller models
  const markers = [
    'Here is the cleaned Markdown:',
    'Here\'s the cleaned Markdown:',
    'Below is the cleaned Markdown:',
  ];
  for (const m of markers) {
    const idx = out.indexOf(m);
    if (idx !== -1) out = out.slice(idx + m.length).trim();
  }

  // If model starts with meta talk, drop leading paragraphs until a likely markdown start.
  // (Keep it conservative.)
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
    max_tokens: 6000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ]
  };

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
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  const j = JSON.parse(text);
  const content = j?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in response');
  return normalizeModelOutput(content);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inDir = args.inDir;
  const outDir = args.outDir;
  const model = args.model || 'llama3.1-8B';
  const baseUrl = args.baseUrl || 'https://api.daiju.live/v1';
  const promptFile = args.promptFile;

  if (!inDir || !outDir || !promptFile) {
    console.error('Missing required args: --inDir, --outDir, --promptFile');
    process.exit(2);
  }

  let apiKey = process.env.DAIJU_API_KEY;
  if (!apiKey) apiKey = await promptHidden('Paste DAIJU_API_KEY (input hidden): ');

  const systemPrompt = await fs.readFile(promptFile, 'utf8');
  await ensureDir(outDir);

  const files = await listMdFiles(inDir);
  if (files.length === 0) {
    console.error(`No .md files found in ${inDir}`);
    process.exit(1);
  }

  for (const fp of files) {
    const name = path.basename(fp);
    const outPath = path.join(outDir, name);
    const raw = await fs.readFile(fp, 'utf8');

    const userText = [
      'CLEAN THIS MARKDOWN INPUT. Output ONLY cleaned Markdown. No preamble.',
      'INPUT_START',
      raw,
      'INPUT_END'
    ].join('\n');

    const cleaned = await callChat({ baseUrl, apiKey, model, systemPrompt, userText });
    await fs.writeFile(outPath, cleaned.endsWith('\n') ? cleaned : cleaned + '\n', 'utf8');
    console.error(`cleaned: ${name} -> ${path.relative(process.cwd(), outPath)}`);
  }
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
