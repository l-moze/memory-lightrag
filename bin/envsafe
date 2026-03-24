#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_ENV = '/home/node/.openclaw/.env';
const KEY_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

function parseArgs(argv) {
  const out = { file: DEFAULT_ENV, _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') out.file = argv[++i];
    else if (a === '--stdin') out.stdin = true;
    else out._.push(a);
  }
  return out;
}

function readLines(file) {
  if (!fs.existsSync(file)) return [];
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/(?<=\n)/);
  if (lines.length === 1 && lines[0] === '') return [];
  return lines;
}

function writeLines(file, lines) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join(''), 'utf8');
}

function backup(file) {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
  const bak = `${file}.bak.${ts}.${ms}.${process.pid}`;
  if (fs.existsSync(file)) fs.copyFileSync(file, bak);
  else fs.writeFileSync(bak, '', 'utf8');
  return bak;
}

function extractKey(line) {
  const m = line.match(KEY_RE);
  return m ? m[1] : null;
}

function listKeys(lines) {
  const out = [];
  for (const ln of lines) {
    const s = ln.trim();
    if (!s || s.startsWith('#')) continue;
    const k = extractKey(ln);
    if (k) out.push(k);
  }
  return out;
}

function normalizeValue(v) {
  if (v.includes('\n')) return JSON.stringify(v);
  return v;
}

function cmdKeys(file) {
  const keys = Array.from(new Set(listKeys(readLines(file)))).sort();
  for (const k of keys) console.log(k);
}

function cmdExists(file, key) {
  const keys = new Set(listKeys(readLines(file)));
  console.log(keys.has(key) ? 'present' : 'missing');
}

function cmdLint(file) {
  const lines = readLines(file);
  const seen = new Map();
  const probs = [];
  lines.forEach((ln, i) => {
    const n = i + 1;
    const s = ln.trim();
    if (!s || s.startsWith('#')) return;
    const k = extractKey(ln);
    if (!k) {
      probs.push(`line ${n}: invalid assignment syntax`);
      return;
    }
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(n);
  });
  for (const [k, arr] of seen.entries()) {
    if (arr.length > 1) probs.push(`duplicate key ${k} at lines ${arr.join(',')}`);
  }
  if (probs.length) {
    for (const p of probs) console.log(p);
    process.exit(2);
  }
  console.log('OK');
}

function cmdSet(file, key, value, stdinMode) {
  if (stdinMode) {
    value = fs.readFileSync(0, 'utf8');
    if (value.endsWith('\n')) value = value.slice(0, -1);
  }
  if (value === undefined) {
    console.error('set requires value or --stdin');
    process.exit(2);
  }
  value = normalizeValue(value);
  const lines = readLines(file);
  const newline = `${key}=${value}\n`;
  let found = false;
  let changed = 0;

  for (let i = 0; i < lines.length; i++) {
    const k = extractKey(lines[i]);
    if (k === key) {
      found = true;
      if (lines[i] !== newline) {
        lines[i] = newline;
        changed++;
      }
    }
  }

  if (!found) {
    if (lines.length > 0 && !lines[lines.length - 1].endsWith('\n')) lines[lines.length - 1] += '\n';
    lines.push(newline);
    changed++;
  }

  const bak = backup(file);
  writeLines(file, lines);
  console.log(`changed=${changed}`);
  console.log(`backup=${bak}`);
}

function cmdUnset(file, key) {
  const lines = readLines(file);
  let removed = 0;
  const out = [];
  for (const ln of lines) {
    const k = extractKey(ln);
    if (k === key) {
      removed++;
      continue;
    }
    out.push(ln);
  }
  const bak = backup(file);
  writeLines(file, out);
  console.log(`removed=${removed}`);
  console.log(`backup=${bak}`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, a1, a2] = args._;
  const file = args.file || DEFAULT_ENV;

  if (!cmd) {
    console.error('usage: envsafe.js [--file PATH] <keys|exists|set|unset|lint> ...');
    process.exit(2);
  }

  if (cmd === 'keys') return cmdKeys(file);
  if (cmd === 'exists') return cmdExists(file, a1);
  if (cmd === 'lint') return cmdLint(file);
  if (cmd === 'set') return cmdSet(file, a1, a2, !!args.stdin);
  if (cmd === 'unset') return cmdUnset(file, a1);

  console.error(`unknown command: ${cmd}`);
  process.exit(2);
})();
