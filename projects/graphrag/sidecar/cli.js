#!/usr/bin/env node

// ----------------------------------------------------------------------
// CLI entry point for openclaw-graphrag
// ----------------------------------------------------------------------

const { buildIndex } = require('./indexer.js');
const { queryIndex } = require('./query.js');

const DEFAULTS = {
  workspace: process.cwd(),
  sandboxDir: 'graphrag_sandbox',
  indexId: 'main',
  docsDir: 'docs',
  maxFiles: 2000,
  maxFileBytes: 10 * 1024 * 1024,
  maxInputBytes: 100 * 1024 * 1024,
  maxChunkChars: 2000,
  maxChunksTotal: 50000,
  topK: 8,
  pathContains: '',
};

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        const key = arg.slice(2, eq);
        const val = arg.slice(eq + 1);
        args[key] = val;
      } else {
        const key = arg.slice(2);
        if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          args[key] = argv[i + 1];
          i++;
        } else {
          args[key] = true;
        }
      }
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function usage() {
  console.error(`Usage: openclaw-graphrag <command> [options]

Commands:
  build                      Build index from docs directory
  query                      Query index with a question

Build options:
  --workspace <path>         Workspace root (default: ${DEFAULTS.workspace})
  --sandboxDir <dir>         Sandbox directory under workspace (default: ${DEFAULTS.sandboxDir})
  --index <id>               Index identifier (default: ${DEFAULTS.indexId})
  --docsDir <path>           Docs directory relative to workspace (default: ${DEFAULTS.docsDir})
  --maxFiles <N>             Maximum number of .md files to index (default: ${DEFAULTS.maxFiles})
  --maxFileBytes <N>         Maximum size per file in bytes (default: ${DEFAULTS.maxFileBytes})
  --maxInputBytes <N>        Total input size limit in bytes (default: ${DEFAULTS.maxInputBytes})
  --maxChunkChars <N>        Maximum characters per chunk (default: ${DEFAULTS.maxChunkChars})
  --maxChunksTotal <N>       Total chunks limit (default: ${DEFAULTS.maxChunksTotal})

Query options:
  --workspace <path>         Workspace root (default: ${DEFAULTS.workspace})
  --sandboxDir <dir>         Sandbox directory under workspace (default: ${DEFAULTS.sandboxDir})
  --index <id>               Index identifier (default: ${DEFAULTS.indexId})
  --question <text>          Question to answer (required)
  --topK <N>                 Total chunks to return (default: ${DEFAULTS.topK})
  --pathContains <substr>    Filter chunks by path substring
  --graph <true|false>       Enable graph expansion (default: false)
  --seedK <N>                Number of seed chunks for graph (default: min(6, topK))
  --expandK <N>              Maximum expanded chunks (default: min(6, topK))
  --minEntityHits <N>        Minimum shared entities for expansion (default: 2)
  --maxExpandChars <N>       Character budget for expanded chunks (default: 6000)

Output:
  JSON to stdout, errors to stderr.
  Use --help to show this message.
`);
}

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

// Handle EPIPE gracefully (e.g., when piped to head)
process.stdout.on('error', err => {
  if (err.code === 'EPIPE') process.exit(0);
});

main().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
