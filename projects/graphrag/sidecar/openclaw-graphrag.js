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

  // Release-based indexing (atomic activate via pointer switch)
  const releasesDir = path.join(indexDir, 'releases');
  const releaseName = new Date().toISOString().replace(/[:.]/g, '-');
  const stagingDir = path.join(releasesDir, `${releaseName}.staging`);
  const releaseDir = path.join(releasesDir, releaseName);

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

  // -----------------------------
  // Entity extraction (GraphRAG v0)
  // -----------------------------
  // Minimal, rules-only entity extraction to support 1-hop expansion.
  // Step2: add denoising + canonicalization.
  const STOP_ENTITY = new Set([
    // section boilerplate
    'introduction','abstract','references','appendix','conclusion','limitations','acknowledgments',
    'table','figure','dataset','datasets','results','discussion','method','methods','overview',
    'related work','related-work','implementation details','experimental setup',
    // overly generic technical terms (too high degree, low value)
    'rag','llm','gpt','api','nlp','url','openai','acm','ieee','usa'
  ]);

  function canonicalKey(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[`"'“”]/g, '')
      .replace(/[^a-z0-9\/_\-\s\.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeEntity(s) {
    return String(s)
      .trim()
      .replace(/^[#\-\*\s]+/, '')
      .replace(/[\s\.,;:()\[\]{}<>"'`]+$/g, '')
      .slice(0, 80);
  }

  function isJunkEntity(name) {
    const n = String(name || '').trim();
    if (!n) return true;
    if (n.length < 3) return true;
    if (/^\d+(?:\.\d+)*$/.test(n)) return true; // section numbers
    if (/^(https?:\/\/|www\.)/i.test(n)) return true;
    const key = canonicalKey(n);
    if (!key) return true;
    if (STOP_ENTITY.has(key)) return true;
    if (key.startsWith('appendix ')) return true;
    if (key.startsWith('table ')) return true;
    if (key.startsWith('figure ')) return true;
    if (key === 'source') return true;
    if (key.startsWith('input_start') || key.startsWith('input_end')) return true;
    return false;
  }

  function extractEntities(text) {
    const ents = new Map(); // canonical -> display
    const t = String(text || '');

    const add = (raw) => {
      const disp = normalizeEntity(raw);
      if (isJunkEntity(disp)) return;
      const key = canonicalKey(disp);
      if (!key) return;
      // prefer the first seen display form
      if (!ents.has(key)) ents.set(key, disp);
    };

    // Model-like ids: Foo/Bar-Baz
    for (const m of t.matchAll(/\b[A-Z][A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]{3,}\b/g)) add(m[0]);

    // CamelCase / PascalCase words (GraphRAG, HippoRAG, DeepSeek)
    for (const m of t.matchAll(/\b[A-Z][a-z]+(?:[A-Z][A-Za-z0-9]+)+\b/g)) add(m[0]);

    // All-caps tokens length>=3 (RAG, LLM, RAPTOR)
    for (const m of t.matchAll(/\b[A-Z]{3,}(?:-[A-Z0-9]{2,})?\b/g)) add(m[0]);

    // Headings: treat heading as weak entity but denoise aggressively
    for (const line of t.split(/\r?\n/)) {
      const hm = line.match(/^#{1,6}\s+(.{3,})$/);
      if (hm) add(hm[1].slice(0, 60));
    }

    // Cap per chunk
    return [...ents.values()].slice(0, 30);
  }

  const entityToChunks = new Map();
  const chunkToEntities = new Map();
  for (const c of chunks) {
    const ents = extractEntities(c.text);
    chunkToEntities.set(c.chunkId, ents);
    for (const e of ents) {
      const key = e;
      if (!entityToChunks.has(key)) entityToChunks.set(key, []);
      entityToChunks.get(key).push(c.chunkId);
    }
  }

  // Persist entities with simple stats for debugging/denoising.
  const entityDf = {};
  for (const [e, cids] of entityToChunks.entries()) entityDf[e] = cids.length;

  // Build deterministic neighbor links within each document (DocGraph adjacency).
  const docToChunkIds = new Map();
  for (const c of chunks) {
    if (!docToChunkIds.has(c.path)) docToChunkIds.set(c.path, []);
    docToChunkIds.get(c.path).push({ chunkId: c.chunkId, startLine: c.startLine });
  }
  const neighbors = {};
  for (const [p, arr] of docToChunkIds.entries()) {
    arr.sort((a, b) => a.startLine - b.startLine);
    for (let i = 0; i < arr.length; i++) {
      const prev = i > 0 ? arr[i - 1].chunkId : null;
      const next = i + 1 < arr.length ? arr[i + 1].chunkId : null;
      neighbors[arr[i].chunkId] = [prev, next].filter(Boolean);
    }
  }

  const entitiesArtifact = {
    schemaVersion: 3,
    builtAt: new Date().toISOString(),
    entityCount: entityToChunks.size,
    entityDf,
    entityToChunks: Object.fromEntries(entityToChunks),
    chunkToEntities: Object.fromEntries(chunkToEntities),
    // DocGraph adjacency edges (deterministic, no LLM)
    neighbors,
  };

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
      entities: entityToChunks.size,
    },
    artifacts: {
      chunks: 'chunks.json',
      minisearch: 'minisearch.json',
      entities: 'entities.json',
    },
  };

  await writeJsonAtomic(path.join(stagingDir, 'chunks.json'), chunks);
  // MiniSearch.toJSON() returns a plain object; MiniSearch.loadJSON expects a JSON string.
  await writeTextAtomic(path.join(stagingDir, 'minisearch.json'), JSON.stringify(miniSearch.toJSON()));
  await writeJsonAtomic(path.join(stagingDir, 'entities.json'), entitiesArtifact);
  await writeJsonAtomic(path.join(stagingDir, 'manifest.json'), manifest);

  // -----------------------------
  // Atomic activate (release pointer switch)
  // -----------------------------
  const backupDir = path.join(indexDir, 'backup');
  await ensureDir(backupDir);

  // 1) finalize release dir
  await ensureDir(releaseDir);
  for (const name of ['chunks.json', 'minisearch.json', 'entities.json', 'manifest.json']) {
    await fsp.rename(path.join(stagingDir, name), path.join(releaseDir, name));
  }
  // best-effort remove empty staging dir
  try { await fsp.rmdir(stagingDir); } catch {}

  // 2) write current pointer atomically
  const currentPath = path.join(indexDir, 'current.json');
  if (fs.existsSync(currentPath)) {
    const stamp = Date.now();
    await fsp.copyFile(currentPath, path.join(backupDir, `current-${stamp}.json`));
  }

  await writeJsonAtomic(currentPath, {
    schemaVersion: 1,
    indexId,
    release: releaseName,
    updatedAt: new Date().toISOString(),
  });

  return { ...manifest, release: releaseName };
}

async function loadIndex({ workspace, sandboxDir, indexId }) {
  const absWorkspace = path.resolve(workspace);
  const absSandbox = path.resolve(absWorkspace, sandboxDir);
  const indexDir = path.join(absSandbox, 'indices', indexId);

  // Resolve active release
  let activeDir = indexDir;
  const currentPath = path.join(indexDir, 'current.json');
  if (fs.existsSync(currentPath)) {
    const cur = JSON.parse(await fsp.readFile(currentPath, 'utf8'));
    if (cur?.release) {
      activeDir = path.join(indexDir, 'releases', cur.release);
    }
  }

  const manifestPath = path.join(activeDir, 'manifest.json');
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  const chunks = JSON.parse(await fsp.readFile(path.join(activeDir, manifest.artifacts.chunks), 'utf8'));
  const msJsonText = await fsp.readFile(path.join(activeDir, manifest.artifacts.minisearch), 'utf8');
  const entitiesPath = manifest.artifacts?.entities ? path.join(activeDir, manifest.artifacts.entities) : null;
  const entities = entitiesPath && fs.existsSync(entitiesPath)
    ? JSON.parse(await fsp.readFile(entitiesPath, 'utf8'))
    : null;

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

  return { manifest, miniSearch, byId, entities };
}

async function queryIndex({ workspace, sandboxDir, indexId, question, topK, pathContains, graph, seedK, expandK, minEntityHits, maxExpandChars }) {
  const t0 = Date.now();
  const { manifest, miniSearch, byId, entities } = await loadIndex({ workspace, sandboxDir, indexId });
  const tLoad = Date.now();

  const want = (pathContains && String(pathContains).trim()) ? String(pathContains).trim().toLowerCase() : null;

  const useGraph = Boolean(graph) && Boolean(entities && entities.entityToChunks && entities.chunkToEntities);
  const kSeed = Number(seedK || Math.min(6, topK));
  const kExpand = Number(expandK || Math.min(6, topK));
  const minHits = Number(minEntityHits || 2);
  const expandBudgetChars = Number(maxExpandChars || 6000);

  // Search wider then filter; keeps the filtering feature simple.
  const hits = miniSearch.search(question, { limit: Math.max(topK * 10, topK) });
  const tSearch = Date.now();

  // 1) seed chunks
  const seeds = [];
  for (const h of hits) {
    if (seeds.length >= kSeed) break;
    const c = byId.get(h.id);
    if (!c) continue;
    if (want && !String(c.path).toLowerCase().includes(want)) continue;
    seeds.push({ hit: h, chunk: c });
  }

  // 2) graph expand (entity -> chunks + doc neighbors)
  const expanded = [];
  const expandedWhy = new Map();

  // Precompute lexical scores for tie-break / matching quality.
  const lexHits = miniSearch.search(question, { limit: Math.max(topK * 50, 200) });
  const lexScoreById = new Map(lexHits.map(h => [h.id, h.score]));
  const maxLex = Math.max(1, ...lexHits.map(h => h.score || 0));

  // Compute df penalty factors for entities (smooth IDF-like)
  const entityDf = entities?.entityDf || {};
  const dfValues = Object.values(entityDf);
  const avgDf = dfValues.length > 0 ? dfValues.reduce((a, b) => a + b, 0) / dfValues.length : 1.0;
  const gamma = 1.0; // penalty strength, configurable later
  const entityPenalty = new Map();
  for (const [e, df] of Object.entries(entityDf)) {
    const penalty = 1.0 / (1.0 + gamma * Math.log(1.0 + df / avgDf));
    entityPenalty.set(e, penalty);
  }

  if (useGraph) {
    const seedIds = new Set(seeds.map(s => s.chunk.chunkId));

    const seedEntities = new Set();
    for (const s of seeds) {
      const ents = entities.chunkToEntities[s.chunk.chunkId] || [];
      for (const e of ents) seedEntities.add(e);
    }

    // score candidate chunks by how many seed entities they share, with df penalty
    const candScores = new Map();
    const candWhyEntities = new Map(); // cid -> Set(entity)

    for (const e of seedEntities) {
      const penalty = entityPenalty.get(e) || 1.0;
      const chunkIds = entities.entityToChunks[e] || [];
      for (const cid of chunkIds) {
        if (seedIds.has(cid)) continue;
        // each entity contributes penalty-weighted score
        candScores.set(cid, (candScores.get(cid) || 0) + penalty);
        if (!candWhyEntities.has(cid)) candWhyEntities.set(cid, new Set());
        candWhyEntities.get(cid).add(e);
      }
    }

    // Add DocGraph neighbors (deterministic, good for "local" evidence)
    const neigh = entities.neighbors || {};
    for (const s of seeds) {
      const ns = neigh[s.chunk.chunkId] || [];
      for (const cid of ns) {
        if (seedIds.has(cid)) continue;
        candScores.set(cid, (candScores.get(cid) || 0) + 1);
        if (!candWhyEntities.has(cid)) candWhyEntities.set(cid, new Set());
        candWhyEntities.get(cid).add('__neighbor__');
      }
    }

    // Candidate list (widened); we'll select with a budgeted knapsack.
    const candidates = [...candScores.entries()]
      .filter(([, score]) => score >= minHits)
      .map(([cid, shared]) => {
        const c = byId.get(cid);
        if (!c) return null;
        if (want && !String(c.path).toLowerCase().includes(want)) return null;
        const lex = (lexScoreById.get(cid) || 0) / maxLex;
        const whyEnts = [...(candWhyEntities.get(cid) || new Set())];
        const neighborBonus = whyEnts.includes('__neighbor__') ? 0.5 : 0;
        // shared is already penalty-weighted sum of entity contributions
        const value = shared * 1.0 + lex * 1.2 + neighborBonus;
        const cost = Math.min(2000, (c.text || '').length + 80);
        return { cid, chunk: c, shared, lex, value, cost, whyEnts };
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value)
      .slice(0, Math.max(kExpand * 20, 120));

    // -----------------------------
    // Budgeted selection (0/1 knapsack DP) over small candidates.
    // We discretize char budget to keep DP small.
    // -----------------------------
    const UNIT = 200; // chars per unit
    const B = Math.max(1, Math.floor(expandBudgetChars / UNIT));
    const n = candidates.length;

    // dp[b] = best score, take[b] = bitset as predecessor pointers (store prev b and chosen idx)
    const dp = new Array(B + 1).fill(-1);
    const prevB = new Array(B + 1).fill(-1);
    const prevI = new Array(B + 1).fill(-1);
    dp[0] = 0;

    for (let i = 0; i < n; i++) {
      const w = Math.max(1, Math.ceil(candidates[i].cost / UNIT));
      const v = candidates[i].value;
      for (let b = B; b >= w; b--) {
        const cand = dp[b - w];
        if (cand < 0) continue;
        const nv = cand + v;
        if (nv > dp[b]) {
          dp[b] = nv;
          prevB[b] = b - w;
          prevI[b] = i;
        }
      }
    }

    // pick best b
    let bestB = 0;
    for (let b = 1; b <= B; b++) if (dp[b] > dp[bestB]) bestB = b;

    const chosen = [];
    const used = new Set();
    for (let b = bestB; b > 0 && prevI[b] !== -1; ) {
      const i = prevI[b];
      if (!used.has(i)) {
        chosen.push(candidates[i]);
        used.add(i);
      }
      b = prevB[b];
    }

    chosen.sort((a, b) => b.value - a.value);
    for (const it of chosen.slice(0, kExpand)) {
      expanded.push({ chunk: it.chunk, score: it.shared });
      const ents = it.whyEnts.filter(e => e !== '__neighbor__');
      const extra = it.whyEnts.includes('__neighbor__') ? ' neighbor' : '';
      expandedWhy.set(it.cid, `expanded(shared_entities=${it.shared}${extra}; ents=${ents.slice(0,6).join(',')})`);
    }
  }

  // 3) fuse
  const fused = [];
  const addChunk = (c, score, why) => {
    if (fused.some(x => x.chunkId === c.chunkId)) return;
    fused.push({
      chunkId: c.chunkId,
      path: c.path,
      start: c.startLine,
      end: c.endLine,
      score,
      why,
    });
  };

  for (const s of seeds) addChunk(s.chunk, s.hit.score, 'seed');
  for (const ex of expanded) addChunk(ex.chunk, ex.score, expandedWhy.get(ex.chunk.chunkId) || 'expanded');

  // Fill remaining slots with lexical hits (baseline)
  for (const h of hits) {
    if (fused.length >= topK) break;
    const c = byId.get(h.id);
    if (!c) continue;
    if (want && !String(c.path).toLowerCase().includes(want)) continue;
    addChunk(c, h.score, 'lexical');
  }

  const citations = fused.map(c => ({ path: c.path, chunkId: c.chunkId, start: c.start, end: c.end }));
  const contextParts = fused.map(c => {
    const full = byId.get(c.chunkId);
    return `SOURCE: ${c.path}:${c.start}-${c.end}\n${full?.text || ''}`;
  });

  const answerContext = contextParts.join('\n\n---\n\n');

  return {
    schemaVersion: 1,
    indexId,
    answerContext,
    citations,
    chunks: fused,
    subgraph: {
      entities: useGraph ? [...new Set(seeds.flatMap(s => (entities.chunkToEntities[s.chunk.chunkId] || [])))].slice(0, 50).map(name => ({ name })) : [],
      relations: [],
    },
    debug: {
      timingMs: {
        loadIndex: tLoad - t0,
        search: tSearch - tLoad,
        format: Date.now() - tSearch,
        total: Date.now() - t0,
      },
      stats: manifest.stats,
      graph: {
        enabled: useGraph,
        seedK: kSeed,
        expandK: kExpand,
        minEntityHits: minHits,
      }
    },
  };
}

function usage() {
  console.error(`Usage:
  openclaw-graphrag build [--workspace <path>] [--docsDir <rel>] [--sandboxDir <rel>] [--index <id>]
  openclaw-graphrag query --question "..." [--topK 8] [--graph true] [--seedK 6] [--expandK 6] [--minEntityHits 2] [--pathContains "..."] [--workspace <path>] [--sandboxDir <rel>] [--index <id>] [--format json]
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
      graph: args.graph,
      seedK: args.seedK,
      expandK: args.expandK,
      minEntityHits: args.minEntityHits,
      maxExpandChars: args.maxExpandChars,
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
