const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

// ----------------------------------------------------------------------
// Path and file utilities
// ----------------------------------------------------------------------

function sha1(data) {
  return crypto.createHash('sha1').update(data).digest('hex');
}

function stableChunkId(filePath, startLine, endLine, text) {
  const key = `${filePath}:${startLine}:${endLine}:${sha1(text)}`;
  return 'c_' + sha1(key).slice(0, 24);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function writeJsonAtomic(targetPath, obj) {
  const tmp = targetPath + '.tmp.' + Date.now() + '-' + Math.random().toString(36).slice(2);
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fsp.rename(tmp, targetPath);
}

async function writeTextAtomic(targetPath, text) {
  const tmp = targetPath + '.tmp.' + Date.now() + '-' + Math.random().toString(36).slice(2);
  await fsp.writeFile(tmp, text, 'utf8');
  await fsp.rename(tmp, targetPath);
}

// ----------------------------------------------------------------------
// Markdown file scanning with limits
// ----------------------------------------------------------------------

async function listMarkdownFiles(rootDir, {
  maxFiles = 2000,
  maxFileBytes = 10 * 1024 * 1024,
  maxInputBytes = 100 * 1024 * 1024,
  sandboxBasename = '',
} = {}) {
  const files = [];
  let totalBytes = 0;
  const skipDirs = new Set(['.git', 'node_modules', sandboxBasename].filter(Boolean));

  async function scan(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (files.length >= maxFiles || totalBytes >= maxInputBytes) break;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!skipDirs.has(ent.name)) await scan(full);
      } else if (ent.isFile() && /\.md$/i.test(ent.name)) {
        const stat = await fsp.stat(full);
        if (stat.size <= maxFileBytes) {
          files.push({ path: full, size: stat.size });
          totalBytes += stat.size;
        }
      }
    }
  }

  await scan(rootDir);
  return files;
}

// ----------------------------------------------------------------------
// Markdown chunking
// ----------------------------------------------------------------------

function chunkMarkdown(text, maxChunkChars = 2000) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let current = [];
  let currentStart = 1;
  let currentCharCount = 0;

  function flush() {
    if (current.length === 0) return;
    chunks.push({
      startLine: currentStart,
      endLine: currentStart + current.length - 1,
      text: current.join('\n'),
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineChars = line.length + 1; // +1 for newline

    // Heading boundary (##, ###, etc.)
    const isHeading = /^#{1,6}\s/.test(line);

    if ((currentCharCount + lineChars > maxChunkChars && current.length > 0) || isHeading) {
      flush();
      current = [line];
      currentStart = i + 1;
      currentCharCount = lineChars;
    } else {
      current.push(line);
      currentCharCount += lineChars;
    }

    // Safety: force flush if chunk gets too large
    if (currentCharCount >= maxChunkChars * 1.5) {
      flush();
      current = [];
      currentCharCount = 0;
      currentStart = i + 2; // next line
    }
  }

  flush();
  return chunks;
}

// ----------------------------------------------------------------------
// Exports
// ----------------------------------------------------------------------

module.exports = {
  sha1,
  stableChunkId,
  ensureDir,
  writeJsonAtomic,
  writeTextAtomic,
  listMarkdownFiles,
  chunkMarkdown,
};
