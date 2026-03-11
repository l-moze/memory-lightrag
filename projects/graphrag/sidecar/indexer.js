// ----------------------------------------------------------------------
// Index building and persistence
// ----------------------------------------------------------------------

const MiniSearch = require('minisearch');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const { listMarkdownFiles, chunkMarkdown, stableChunkId, ensureDir, writeJsonAtomic, writeTextAtomic } = require('./utils.js');
const { buildEntityGraph } = require('./graph.js');

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

  // Build entity graph
  const { entityToChunks, chunkToEntities, neighbors, entityDf } = buildEntityGraph(chunks);

  // Persist entities with simple stats for debugging/denoising.
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

// ----------------------------------------------------------------------
// Exports
// ----------------------------------------------------------------------

module.exports = {
  buildIndex,
};
