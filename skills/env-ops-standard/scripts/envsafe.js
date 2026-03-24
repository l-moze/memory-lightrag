#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_ENV = '/home/node/.openclaw/.env';
const DEFAULT_POLICY = '/home/node/.openclaw/envsafe-policy.json';
const KEY_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;
const STRICT_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function parseArgs(argv) {
  const out = {
    file: DEFAULT_ENV,
    policy: DEFAULT_POLICY,
    profile: '',
    backupKeep: 20,
    backupTtlDays: 7,
    lockTimeoutMs: 5000,
    dedupe: 'keep-last',
    requireStdin: true,
    allowArgv: false,
    protectedKeys: [],
    requiredProfiles: {},
    defaultProfile: '',
    _: [],
    __explicit: new Set(),
  };

  function setOpt(k, v = true) {
    out[k] = v;
    out.__explicit.add(k);
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') setOpt('file', argv[++i]);
    else if (a === '--policy') setOpt('policy', argv[++i]);
    else if (a === '--profile') setOpt('profile', argv[++i]);
    else if (a === '--stdin') setOpt('stdin', true);
    else if (a === '--allow-argv') setOpt('allowArgv', true);
    else if (a === '--if-missing') setOpt('ifMissing', true);
    else if (a === '--dry-run') setOpt('dryRun', true);
    else if (a === '--force') setOpt('force', true);
    else if (a === '--backup-keep') setOpt('backupKeep', Number(argv[++i]));
    else if (a === '--backup-ttl-days') setOpt('backupTtlDays', Number(argv[++i]));
    else if (a === '--lock-timeout-ms') setOpt('lockTimeoutMs', Number(argv[++i]));
    else if (a === '--dedupe') setOpt('dedupe', argv[++i] || 'keep-last');
    else out._.push(a);
  }
  return out;
}

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function readJson(file) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    die(`invalid policy json: ${file}`);
  }
}

function applyPolicy(opts) {
  const raw = readJson(opts.policy);
  if (!raw) return;

  const d = raw.defaults || {};
  const mapDefaults = [
    'file',
    'backupKeep',
    'backupTtlDays',
    'lockTimeoutMs',
    'dedupe',
    'requireStdin',
    'allowArgv',
    'defaultProfile',
  ];

  for (const k of mapDefaults) {
    if (!opts.__explicit.has(k) && Object.prototype.hasOwnProperty.call(d, k)) {
      opts[k] = d[k];
    }
  }

  if (!opts.__explicit.has('protectedKeys') && Array.isArray(raw.protectedKeys)) {
    opts.protectedKeys = raw.protectedKeys.filter((x) => typeof x === 'string');
  }
  if (!opts.__explicit.has('requiredProfiles') && raw.requiredProfiles && typeof raw.requiredProfiles === 'object') {
    opts.requiredProfiles = raw.requiredProfiles;
  }

  if (!opts.__explicit.has('profile') && opts.defaultProfile && !opts.profile) {
    opts.profile = opts.defaultProfile;
  }
}

function readLines(file) {
  if (!fs.existsSync(file)) return [];
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/(?<=\n)/);
  if (lines.length === 1 && lines[0] === '') return [];
  return lines;
}

function buildText(lines) {
  return lines.join('');
}

function writeFileAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${Date.now()}.${process.pid}`;
  fs.writeFileSync(tmp, text, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, 0o600);
  } catch (_) {}
}

function backupFile(file) {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const ms = String(now.getUTCMilliseconds()).padStart(3, '0');
  const bak = `${file}.bak.${ts}.${ms}.${process.pid}`;
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, bak);
    try {
      fs.chmodSync(bak, 0o600);
    } catch (_) {}
  } else {
    fs.writeFileSync(bak, '', { encoding: 'utf8', mode: 0o600 });
  }
  return bak;
}

function pruneBackups(file, keep, ttlDays) {
  const dir = path.dirname(file);
  const base = path.basename(file);
  if (!fs.existsSync(dir)) return { deleted: 0, remaining: 0 };

  const now = Date.now();
  const ttlMs = Math.max(0, Number(ttlDays) || 0) * 24 * 60 * 60 * 1000;

  let backups = fs
    .readdirSync(dir)
    .filter((n) => n.startsWith(`${base}.bak.`))
    .map((n) => {
      const p = path.join(dir, n);
      const st = fs.statSync(p);
      return { path: p, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  let deleted = 0;

  if (ttlMs > 0) {
    for (const b of backups) {
      if (now - b.mtimeMs > ttlMs) {
        try {
          fs.unlinkSync(b.path);
          deleted++;
        } catch (_) {}
      }
    }
    backups = backups.filter((b) => fs.existsSync(b.path));
  }

  const keepN = Math.max(0, Number(keep) || 0);
  for (let i = keepN; i < backups.length; i++) {
    try {
      fs.unlinkSync(backups[i].path);
      deleted++;
    } catch (_) {}
  }

  const remaining = fs
    .readdirSync(dir)
    .filter((n) => n.startsWith(`${base}.bak.`)).length;
  return { deleted, remaining };
}

function extractKey(line) {
  const m = line.match(KEY_RE);
  return m ? m[1] : null;
}

function validateKey(key) {
  if (!STRICT_KEY_RE.test(key || '')) die(`invalid key: ${key}`);
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

function withLock(file, timeoutMs, fn) {
  const lockFile = `${file}.lock`;
  const start = Date.now();

  while (true) {
    try {
      const fd = fs.openSync(lockFile, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, String(process.pid));
      } catch (_) {}
      try {
        return fn();
      } finally {
        try {
          fs.closeSync(fd);
        } catch (_) {}
        try {
          fs.unlinkSync(lockFile);
        } catch (_) {}
      }
    } catch (_) {
      if (Date.now() - start > timeoutMs) {
        die(`lock timeout after ${timeoutMs}ms: ${lockFile}`);
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}

function lintFindings(file) {
  const lines = readLines(file);
  const seen = new Map();
  const invalidLines = [];
  lines.forEach((ln, i) => {
    const n = i + 1;
    const s = ln.trim();
    if (!s || s.startsWith('#')) return;
    const k = extractKey(ln);
    if (!k) {
      invalidLines.push(n);
      return;
    }
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(n);
  });

  const duplicates = [];
  for (const [k, locs] of seen.entries()) {
    if (locs.length > 1) duplicates.push({ key: k, lines: locs });
  }

  return {
    invalidLines,
    duplicates,
    keyCount: seen.size,
    assignmentCount: [...seen.values()].reduce((a, x) => a + x.length, 0),
    keys: [...seen.keys()].sort(),
  };
}

function requiredMissing(opts, presentKeys) {
  const p = opts.profile;
  if (!p) return [];
  const req = opts.requiredProfiles?.[p];
  if (!Array.isArray(req)) return [];
  const set = new Set(presentKeys);
  return req.filter((k) => !set.has(k));
}

function cmdKeys(opts) {
  const keys = Array.from(new Set(listKeys(readLines(opts.file)))).sort();
  for (const k of keys) console.log(k);
}

function cmdExists(opts, key) {
  validateKey(key);
  const keys = new Set(listKeys(readLines(opts.file)));
  console.log(keys.has(key) ? 'present' : 'missing');
}

function cmdLint(opts) {
  const f = lintFindings(opts.file);
  for (const n of f.invalidLines) console.log(`line ${n}: invalid assignment syntax`);
  for (const d of f.duplicates) console.log(`duplicate key ${d.key} at lines ${d.lines.join(',')}`);

  const missing = requiredMissing(opts, f.keys);
  if (missing.length) console.log(`missing_required(${opts.profile})=${missing.join(',')}`);

  if (f.invalidLines.length || f.duplicates.length || missing.length) process.exit(2);
  console.log('OK');
}

function applySet(lines, key, value, dedupeMode, ifMissing) {
  const newline = `${key}=${value}\n`;
  const idxs = [];
  for (let i = 0; i < lines.length; i++) {
    if (extractKey(lines[i]) === key) idxs.push(i);
  }

  const out = [...lines];
  let changed = 0;
  let removed = 0;
  let skipped = 0;

  if (idxs.length === 0) {
    if (out.length > 0 && !out[out.length - 1].endsWith('\n')) out[out.length - 1] += '\n';
    out.push(newline);
    changed++;
    return { out, changed, removed, skipped };
  }

  if (ifMissing) {
    skipped = 1;
    return { out, changed, removed, skipped };
  }

  if (dedupeMode === 'none') {
    for (const i of idxs) {
      if (out[i] !== newline) {
        out[i] = newline;
        changed++;
      }
    }
    return { out, changed, removed, skipped };
  }

  const keepIndex = dedupeMode === 'keep-first' ? idxs[0] : idxs[idxs.length - 1];
  const removedSet = new Set(idxs.filter((i) => i !== keepIndex));
  const deduped = [];
  for (let i = 0; i < out.length; i++) {
    if (removedSet.has(i)) {
      removed++;
      continue;
    }
    deduped.push(out[i]);
  }

  let keyLine = -1;
  for (let i = 0; i < deduped.length; i++) {
    if (extractKey(deduped[i]) === key) {
      keyLine = i;
      break;
    }
  }
  if (keyLine >= 0 && deduped[keyLine] !== newline) {
    deduped[keyLine] = newline;
    changed++;
  }

  return { out: deduped, changed, removed, skipped };
}

function cmdSet(opts, key, valueArg) {
  validateKey(key);
  if (!['keep-last', 'keep-first', 'none'].includes(opts.dedupe)) {
    die(`invalid --dedupe value: ${opts.dedupe}`);
  }

  let value;
  if (opts.stdin) {
    value = fs.readFileSync(0, 'utf8');
    if (value.endsWith('\n')) value = value.slice(0, -1);
  } else {
    if (opts.requireStdin && !opts.force) {
      die('stdin is required by policy. Use --stdin (or --force to override).');
    }
    if (!opts.allowArgv) {
      die('argv value disabled for safety. Use --stdin (preferred) or add --allow-argv explicitly.');
    }
    value = valueArg;
  }

  if (value === undefined) die('set requires value: use --stdin or --allow-argv <VALUE>');
  value = normalizeValue(value);

  return withLock(opts.file, opts.lockTimeoutMs, () => {
    const lines = readLines(opts.file);
    const result = applySet(lines, key, value, opts.dedupe, !!opts.ifMissing);

    if (!opts.dryRun) {
      const bak = backupFile(opts.file);
      writeFileAtomic(opts.file, buildText(result.out));
      const pruned = pruneBackups(opts.file, opts.backupKeep, opts.backupTtlDays);
      console.log(`changed=${result.changed}`);
      console.log(`removed=${result.removed}`);
      console.log(`skipped=${result.skipped}`);
      console.log(`backup=${bak}`);
      console.log(`backups_deleted=${pruned.deleted}`);
      console.log(`backups_remaining=${pruned.remaining}`);
      return;
    }

    console.log('dry_run=true');
    console.log(`changed=${result.changed}`);
    console.log(`removed=${result.removed}`);
    console.log(`skipped=${result.skipped}`);
  });
}

function applyUnset(lines, key) {
  const out = [];
  let removed = 0;
  for (const ln of lines) {
    if (extractKey(ln) === key) {
      removed++;
      continue;
    }
    out.push(ln);
  }
  return { out, removed };
}

function cmdUnset(opts, key) {
  validateKey(key);
  if (opts.protectedKeys.includes(key) && !opts.force) {
    die(`refusing to unset protected key: ${key} (use --force to override)`);
  }

  return withLock(opts.file, opts.lockTimeoutMs, () => {
    const lines = readLines(opts.file);
    const result = applyUnset(lines, key);

    if (!opts.dryRun) {
      const bak = backupFile(opts.file);
      writeFileAtomic(opts.file, buildText(result.out));
      const pruned = pruneBackups(opts.file, opts.backupKeep, opts.backupTtlDays);
      console.log(`removed=${result.removed}`);
      console.log(`backup=${bak}`);
      console.log(`backups_deleted=${pruned.deleted}`);
      console.log(`backups_remaining=${pruned.remaining}`);
      return;
    }

    console.log('dry_run=true');
    console.log(`removed=${result.removed}`);
  });
}

function cmdDoctor(opts) {
  const exists = fs.existsSync(opts.file);
  const f = lintFindings(opts.file);
  const dir = path.dirname(opts.file);
  const base = path.basename(opts.file);
  const backupCount = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((n) => n.startsWith(`${base}.bak.`)).length
    : 0;
  const missing = requiredMissing(opts, f.keys);

  console.log(`file=${opts.file}`);
  console.log(`policy=${opts.policy}`);
  console.log(`profile=${opts.profile || 'none'}`);
  console.log(`exists=${exists ? 'yes' : 'no'}`);
  console.log(`keys=${f.keyCount}`);
  console.log(`assignments=${f.assignmentCount}`);
  console.log(`invalid_lines=${f.invalidLines.length}`);
  console.log(`duplicate_keys=${f.duplicates.length}`);
  console.log(`missing_required=${missing.length}`);
  console.log(`backups=${backupCount}`);
  if (f.invalidLines.length) console.log(`invalid_line_numbers=${f.invalidLines.join(',')}`);
  if (f.duplicates.length) console.log(`duplicate_key_names=${f.duplicates.map((x) => x.key).join(',')}`);
  if (missing.length) console.log(`missing_required_keys=${missing.join(',')}`);
}

function cmdPolicy(opts) {
  console.log(`policy=${opts.policy}`);
  console.log(`file=${opts.file}`);
  console.log(`require_stdin=${opts.requireStdin ? 'yes' : 'no'}`);
  console.log(`allow_argv=${opts.allowArgv ? 'yes' : 'no'}`);
  console.log(`dedupe=${opts.dedupe}`);
  console.log(`backup_keep=${opts.backupKeep}`);
  console.log(`backup_ttl_days=${opts.backupTtlDays}`);
  console.log(`lock_timeout_ms=${opts.lockTimeoutMs}`);
  console.log(`profile=${opts.profile || 'none'}`);
  console.log(`protected_keys=${opts.protectedKeys.join(',')}`);
}

(function main() {
  const opts = parseArgs(process.argv.slice(2));
  applyPolicy(opts);
  const [cmd, a1, a2] = opts._;

  if (!cmd) {
    die('usage: envsafe.js [--policy PATH] [--file PATH] [--profile NAME] [--dry-run] [--stdin] [--allow-argv] [--if-missing] [--force] [--dedupe keep-last|keep-first|none] <keys|exists|set|unset|lint|doctor|policy> ...');
  }

  if (cmd === 'keys') return cmdKeys(opts);
  if (cmd === 'exists') return cmdExists(opts, a1);
  if (cmd === 'lint') return cmdLint(opts);
  if (cmd === 'doctor') return cmdDoctor(opts);
  if (cmd === 'policy') return cmdPolicy(opts);
  if (cmd === 'set') return cmdSet(opts, a1, a2);
  if (cmd === 'unset') return cmdUnset(opts, a1);

  die(`unknown command: ${cmd}`);
})();
