// ----------------------------------------------------------------------
// Query processing and graph expansion
// ----------------------------------------------------------------------

const MiniSearch = require('minisearch');

async function loadIndex({ workspace, sandboxDir, indexId }) {
  const path = require('path');
  const fs = require('fs');
  const fsp = fs.promises;

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

function knapsackSelect(candidates, budgetChars) {
  const UNIT = 200; // chars per unit
  const B = Math.max(1, Math.floor(budgetChars / UNIT));
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
  return chosen;
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

  // 2) graph expand (entity -> chunks + doc neighbors)
  const expanded = [];
  const expandedWhy = new Map();

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

    const chosen = knapsackSelect(candidates, expandBudgetChars);

    for (const it of chosen.slice(0, kExpand)) {
      expanded.push({ chunk: it.chunk, score: it.shared });
      const ents = it.whyEnts.filter(e => e !== '__neighbor__');
      const extra = it.whyEnts.includes('__neighbor__') ? ' neighbor' : '';
      expandedWhy.set(it.cid, `expanded(shared_entities=${it.shared.toFixed(2)}${extra}; ents=${ents.slice(0,6).join(',')})`);
    }
  }

  // 3) lexical fallback (if we still need more chunks)
  const lexical = [];
  if (seeds.length + expanded.length < topK) {
    const used = new Set([...seeds.map(s => s.chunk.chunkId), ...expanded.map(e => e.chunk.chunkId)]);
    for (const h of hits) {
      if (lexical.length >= topK - seeds.length - expanded.length) break;
      if (used.has(h.id)) continue;
      const c = byId.get(h.id);
      if (!c) continue;
      if (want && !String(c.path).toLowerCase().includes(want)) continue;
      lexical.push({ hit: h, chunk: c });
    }
  }

  const tExpand = Date.now();

  // Build final chunk list with why labels
  const allChunks = [];
  for (const s of seeds) {
    allChunks.push({
      chunkId: s.chunk.chunkId,
      path: s.chunk.path,
      start: s.chunk.startLine,
      end: s.chunk.endLine,
      score: s.hit.score,
      why: 'seed',
    });
  }
  for (const e of expanded) {
    allChunks.push({
      chunkId: e.chunk.chunkId,
      path: e.chunk.path,
      start: e.chunk.startLine,
      end: e.chunk.endLine,
      score: e.score,
      why: expandedWhy.get(e.chunk.chunkId) || 'expanded',
    });
  }
  for (const l of lexical) {
    allChunks.push({
      chunkId: l.chunk.chunkId,
      path: l.chunk.path,
      start: l.chunk.startLine,
      end: l.chunk.endLine,
      score: l.hit.score,
      why: 'lexical',
    });
  }

  // Build answer context (concatenated source snippets)
  const contextLines = [];
  for (const c of allChunks) {
    const chunk = byId.get(c.chunkId);
    if (!chunk) continue;
    contextLines.push(`SOURCE: ${c.path}:${c.start}-${c.end}`);
    contextLines.push(chunk.text);
    contextLines.push('---');
  }
  const answerContext = contextLines.join('\n');

  // Citations (same as chunks but simplified)
  const citations = allChunks.map(c => ({
    path: c.path,
    chunkId: c.chunkId,
    start: c.start,
    end: c.end,
  }));

  const tEnd = Date.now();

  return {
    schemaVersion: 1,
    indexId,
    answerContext,
    citations,
    chunks: allChunks,
    subgraph: {
      entities: entities ? Object.keys(entities.entityToChunks || {}).slice(0, 20) : [],
      relations: [], // placeholder for future
    },
    debug: {
      timingMs: {
        load: tLoad - t0,
        search: tSearch - tLoad,
        expand: tExpand - tSearch,
        total: tEnd - t0,
      },
      stats: manifest.stats,
      graph: useGraph ? {
        enabled: true,
        seedK: kSeed,
        expandK: kExpand,
        minEntityHits: minHits,
        entityPenalty: Object.fromEntries(entityPenalty),
      } : { enabled: false },
    },
  };
}

// ----------------------------------------------------------------------
// Exports
// ----------------------------------------------------------------------

module.exports = {
  loadIndex,
  queryIndex,
  knapsackSelect,
};
