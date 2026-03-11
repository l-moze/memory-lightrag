// ----------------------------------------------------------------------
// Entity extraction and graph construction
// ----------------------------------------------------------------------

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

function buildEntityGraph(chunks) {
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

  // Build document adjacency (DocGraph)
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

  // Compute entity df (document frequency)
  const entityDf = {};
  for (const [e, cids] of entityToChunks.entries()) entityDf[e] = cids.length;

  return {
    entityToChunks,
    chunkToEntities,
    neighbors,
    entityDf,
  };
}

// ----------------------------------------------------------------------
// Exports
// ----------------------------------------------------------------------

module.exports = {
  extractEntities,
  buildEntityGraph,
  normalizeEntity,
  canonicalKey,
  isJunkEntity,
};
