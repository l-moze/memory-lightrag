#!/usr/bin/env node
/**
 * Very lightweight Markdown cleaner for arXiv HTML->MD conversions.
 *
 * Goals:
 * - Reduce noisy inline HTML tags (<span...>, <math...>, <annotation...>)
 * - Keep readable text
 * - Keep it safe: operate only on provided file paths
 */

const fs = require('fs/promises');
const path = require('path');

function clean(md) {
  let s = md;

  // Drop entire <math ...>...</math> blocks (they are extremely noisy).
  s = s.replace(/<math[\s\S]*?<\/math>/gi, ' ');

  // Drop annotation-xml blocks if any remain
  s = s.replace(/<annotation-xml[\s\S]*?<\/annotation-xml>/gi, ' ');

  // Replace span blocks with their inner text (strip tags)
  s = s.replace(/<span[^>]*>/gi, '');
  s = s.replace(/<\/span>/gi, '');

  // Strip other common inline tags from arXiv HTML
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<cite[^>]*>/gi, '');
  s = s.replace(/<\/cite>/gi, '');

  // Remove any remaining HTML tags conservatively
  s = s.replace(/<[^>]+>/g, ' ');

  // Collapse whitespace
  s = s
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+$/gm, '')
    .trim();

  return s + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.error('Usage: clean_md.js <file1.md> [file2.md ...]');
    process.exit(args.length === 0 ? 2 : 0);
  }

  for (const p of args) {
    const abs = path.resolve(p);
    const raw = await fs.readFile(abs, 'utf8');
    const out = clean(raw);
    await fs.writeFile(abs, out, 'utf8');
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
