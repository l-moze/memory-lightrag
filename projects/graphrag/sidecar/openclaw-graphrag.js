#!/usr/bin/env node
/*
  OpenClaw GraphRAG Sidecar (MVP)
  Milestone A: local lexical search over a clean docs corpus.

  Notes:
  - We intentionally avoid touching OpenClaw core memory index.
  - We also avoid requiring sqlite in this environment; index is JSON + MiniSearch.
  - Output is a stable JSON contract that the main agent can optionally inject.
*/

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const MiniSearch = require('minisearch');

// -----------------------------
// Defaults (safe-first)
// -----------------------------
const DEFAULTS = {
  workspace: process.cwd(),
  sandboxDir: 'graphrag_sandbox',
  indexId: 'main',
  docsDir: 'projects/graphrag/docs',

  // budgets
  maxFiles: 2000,
  maxFileBytes: 2 * 1024 * 1024, // 2MB per file for MVP
  maxInputBytes: 50 * 1024 * 1024, // 50MB total for MVP
  maxChunkChars: 2000,
  maxChunksTotal: 50000,

  // query
  topK: 8,

  // filtering
  pathContains: null,
};

// -----------------------------
// Tiny arg parser
// -----------------------------
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      args._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function stableChunkId(filePath, startLine, endLine, text) {
  return 'c_' + sha1(`${filePath}:${startLine}:${endLine}:${sha1(text)}`).slice(0, 16);
}

async function listMarkdownFiles(rootDir, limits) {
  const out = [];
  let totalBytes = 0;
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === limits.sandboxBasename) continue;
        await walk(p);
      } else if (ent.isFile()) {
        if (!ent.name.toLowerCase().endsWith('.md')) continue;
        const st = await fsp.stat(p);
        if (st.size > limits.maxFileBytes) continue;
        if (out.length >= limits.maxFiles) return;
        if (totalBytes + st.size > limits.maxInputBytes) return;
        totalBytes += st.size;
        out.push({ path: p, mtimeMs: st.mtimeMs, size: st.size });
      }
    }
  }
  await walk(rootDir);
  return out;
}

function chunkMarkdown(text, maxChunkChars) {
  const lines = text.split(/\r?\n/);
  const chunks = [];

  let cur = [];
  let curStart = 1;

  function flush(endLine) {
    const t = cur.join('\n').trim();
    if (t) chunks.push({ startLine: curStart, endLine, text: t });
    cur = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];

    const isHeading = /^#{1,6}\s+/.test(line);
    const isBlank = line.trim() === '';

    // Start a new chunk at headings
    if (isHeading && cur.length) {
      flush(lineNo - 1);
      curStart = lineNo;
    }

    // Keep adding lines
    cur.push(line);

    const curLen = cur.join('\n').length;
    if (curLen >= maxChunkChars) {
      flush(lineNo);
      curStart = lineNo + 1;
      continue;
    }

    // Split on long blank gaps (paragraph boundaries)
    if (isBlank && cur.length) {
      const t = cur.join('\n').trim();
      if (t.length >= Math.floor(maxChunkChars * 0.5)) {
        flush(lineNo);
        curStart = lineNo + 1;
      }
    }
  }
  if (cur.length) flush(lines.length);
  return chunks;
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function writeJsonAtomic(targetPath, obj) {
  const dir = path.dirname(targetPath);
  await ensureDir(dir);
  const tmp = path.join(dir, `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fsp.rename(tmp, targetPath);
}

async function writeTextAtomic(targetPath, text) {
  const dir = path.dirname(targetPath);
  await ensureDir(dir);
  const tmp = path.join(dir, `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
  await fsp.writeFile(tmp, text, 'utf8');
  await fsp.rename(tmp, targetPath);
}

async function buildIndex({ workspace, sandboxDir, indexId, docsDir, maxChunkChars, maxChunksTotal, maxFiles, maxFileBytes, maxInputBytes }) {
  const absWorkspace = path.resolve(workspace);
  const absDocs = path.resolve(absWorkspace, docsDir);
  const absSandbox = path.resolve(absWorkspace, sandboxDir);

  const indicesDir = path.join(absSandbox, 'indices');
  const indexDir = path.join(indicesDir, indexId);
  const stagingDir = path.join(indexDir, 'staging');

  await ensureDir(stagingDir);

  const files = await listMarkdownFiles(absDocs, {
    maxFiles,
    maxFileBytes,
    maxInputBytes,
    sandboxBasename: path.basename(absSandbox),
  });

  const chunks = [];
  for (const f of files) {
    const rel = path.relative(absWorkspace, f.path);
    const raw = await fsp.readFile(f.path, 'utf8');
    const docChunks = chunkMarkdown(raw, maxChunkChars);
    for (const c of docChunks) {
      if (chunks.length >= maxChunksTotal) break;
      const chunkId = stableChunkId(rel, c.startLine, c.endLine, c.text);
      chunks.push({
        chunkId,
        path: rel,
        startLine: c.startLine,
        endLine: c.endLine,
        text: c.text,
      });
    }
    if (chunks.length >= maxChunksTotal) break;
  }

  const miniSearch = new MiniSearch({
    fields: ['text', 'path'],
    storeFields: ['chunkId', 'path', 'startLine', 'endLine'],
    searchOptions: {
      boost: { text: 2, path: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  miniSearch.addAll(chunks.map(c => ({
    id: c.chunkId,
    chunkId: c.chunkId,
    path: c.path,
    startLine: c.startLine,
    endLine: c.endLine,
    text: c.text,
  })));

  // Persist
  const manifest = {
    schemaVersion: 1,
    indexId,
    builtAt: new Date().toISOString(),
    workspace: path.resolve(workspace),
    docsDir,
    stats: {
      files: files.length,
      chunks: chunks.length,
    },
    artifacts: {
      chunks: 'chunks.json',
      minisearch: 'minisearch.json',
    },
  };

  await writeJsonAtomic(path.join(stagingDir, 'chunks.json'), chunks);
  // MiniSearch.toJSON() returns a plain object; MiniSearch.loadJSON expects a JSON string.
  await writeTextAtomic(path.join(stagingDir, 'minisearch.json'), JSON.stringify(miniSearch.toJSON()));
  await writeJsonAtomic(path.join(stagingDir, 'manifest.json'), manifest);

  // Atomic activate: replace active dir contents by moving staging -> active
  // We keep last manifest as backup.
  const activeManifest = path.join(indexDir, 'manifest.json');
  const backupDir = path.join(indexDir, 'backup');
  await ensureDir(backupDir);

  if (fs.existsSync(activeManifest)) {
    const stamp = Date.now();
    const prev = path.join(backupDir, `manifest-${stamp}.json`);
    await fsp.copyFile(activeManifest, prev);
  }

  // Move staging contents into indexDir
  for (const name of ['chunks.json', 'minisearch.json', 'manifest.json']) {
    await fsp.rename(path.join(stagingDir, name), path.join(indexDir, name));
  }

  return manifest;
}

async function loadIndex({ workspace, sandboxDir, indexId }) {
  const absWorkspace = path.resolve(workspace);
  const absSandbox = path.resolve(absWorkspace, sandboxDir);
  const indexDir = path.join(absSandbox, 'indices', indexId);

  const manifestPath = path.join(indexDir, 'manifest.json');
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  const chunks = JSON.parse(await fsp.readFile(path.join(indexDir, manifest.artifacts.chunks), 'utf8'));
  const msJsonText = await fsp.readFile(path.join(indexDir, manifest.artifacts.minisearch), 'utf8');

  const miniSearch = MiniSearch.loadJSON(msJsonText, {
    fields: ['text', 'path'],
    storeFields: ['chunkId', 'path', 'startLine', 'endLine'],
    searchOptions: {
      boost: { text: 2, path: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  // Fast lookup for text by id (citations need locations; context needs text)
  const byId = new Map(chunks.map(c => [c.chunkId, c]));

  return { manifest, miniSearch, byId };
}

async function queryIndex({ workspace, sandboxDir, indexId, question, topK, pathContains }) {
  const t0 = Date.now();
  const { manifest, miniSearch, byId } = await loadIndex({ workspace, sandboxDir, indexId });
  const tLoad = Date.now();

  // Search wider then filter; keeps the filtering feature simple.
  const hits = miniSearch.search(question, { limit: Math.max(topK * 5, topK) });
  const tSearch = Date.now();

  const chunks = [];
  const citations = [];
  const contextParts = [];

  const want = (pathContains && String(pathContains).trim()) ? String(pathContains).trim().toLowerCase() : null;

  for (const h of hits) {
    if (chunks.length >= topK) break;
    const c = byId.get(h.id);
    if (!c) continue;
    if (want && !String(c.path).toLowerCase().includes(want)) continue;
    chunks.push({
      chunkId: c.chunkId,
      path: c.path,
      start: c.startLine,
      end: c.endLine,
      score: h.score,
      why: 'lexical',
    });
    citations.push({ path: c.path, chunkId: c.chunkId, start: c.startLine, end: c.endLine });
    contextParts.push(`SOURCE: ${c.path}:${c.startLine}-${c.endLine}\n${c.text}`);
  }

  const answerContext = contextParts.join('\n\n---\n\n');

  return {
    schemaVersion: 1,
    indexId,
    answerContext,
    citations,
    chunks,
    subgraph: { entities: [], relations: [] },
    debug: {
      timingMs: {
        loadIndex: tLoad - t0,
        search: tSearch - tLoad,
        format: Date.now() - tSearch,
        total: Date.now() - t0,
      },
      stats: manifest.stats,
    },
  };
}

function usage() {
  console.error(`Usage:
  openclaw-graphrag build [--workspace <path>] [--docsDir <rel>] [--sandboxDir <rel>] [--index <id>]
  openclaw-graphrag query --question "..." [--topK 8] [--pathContains "..."] [--workspace <path>] [--sandboxDir <rel>] [--index <id>] [--format json]
`);
}

// Avoid crashing when stdout consumer closes early (e.g., piping to `head`).
process.stdout.on('error', (err) => {
  if (err && err.code === 'EPIPE') process.exit(0);
});

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const cmd = args._[0];

  if (!cmd || cmd === 'help' || args.help) {
    usage();
    process.exit(cmd ? 0 : 1);
  }

  const workspace = args.workspace || DEFAULTS.workspace;
  const sandboxDir = args.sandboxDir || DEFAULTS.sandboxDir;
  const indexId = args.index || DEFAULTS.indexId;

  if (cmd === 'build') {
    const docsDir = args.docsDir || DEFAULTS.docsDir;
    const manifest = await buildIndex({
      workspace,
      sandboxDir,
      indexId,
      docsDir,
      maxFiles: Number(args.maxFiles || DEFAULTS.maxFiles),
      maxFileBytes: Number(args.maxFileBytes || DEFAULTS.maxFileBytes),
      maxInputBytes: Number(args.maxInputBytes || DEFAULTS.maxInputBytes),
      maxChunkChars: Number(args.maxChunkChars || DEFAULTS.maxChunkChars),
      maxChunksTotal: Number(args.maxChunksTotal || DEFAULTS.maxChunksTotal),
    });
    process.stdout.write(JSON.stringify({ ok: true, manifest }, null, 2));
    return;
  }

  if (cmd === 'query') {
    const question = args.question;
    if (!question) {
      console.error('Missing --question');
      process.exit(2);
    }
    const topK = Number(args.topK || DEFAULTS.topK);
    const out = await queryIndex({
      workspace,
      sandboxDir,
      indexId,
      question,
      topK,
      pathContains: args.pathContains || DEFAULTS.pathContains,
    });
    process.stdout.write(JSON.stringify(out, null, 2));
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(2);
}

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
