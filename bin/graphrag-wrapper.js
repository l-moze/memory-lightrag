#!/usr/bin/env node

// ----------------------------------------------------------------------
// GraphRAG wrapper for OpenClaw main agent integration
// ----------------------------------------------------------------------

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  // Path to sidecar CLI (relative to workspace root)
  sidecarPath: path.join(__dirname, '..', 'projects/graphrag/sidecar/cli.js'),
  // Default sandbox directory
  sandboxDir: 'graphrag_sandbox',
  // Default index ID
  indexId: 'main',
  // Timeout for sidecar calls (ms)
  timeoutMs: 10000,
  // Enable/disable graph expansion by default
  graphEnabled: true,
  // Fallback to baseline if sidecar fails
  fallbackEnabled: true,
};

// ----------------------------------------------------------------------
// Configuration loading (priority: env > openclaw.json > defaults)
// ----------------------------------------------------------------------

function loadConfig() {
  const config = { ...CONFIG };

  // Environment variables
  if (process.env.OPENCLAW_GRAPHRAG_ENABLED !== undefined) {
    config.graphEnabled = process.env.OPENCLAW_GRAPHRAG_ENABLED === 'true';
  }
  if (process.env.OPENCLAW_GRAPHRAG_SANDBOX_DIR) {
    config.sandboxDir = process.env.OPENCLAW_GRAPHRAG_SANDBOX_DIR;
  }
  if (process.env.OPENCLAW_GRAPHRAG_TIMEOUT_MS) {
    config.timeoutMs = parseInt(process.env.OPENCLAW_GRAPHRAG_TIMEOUT_MS, 10);
  }

  // OpenClaw config (if available)
  try {
    const openclawConfigPath = path.join(process.env.HOME || '/', '.openclaw/openclaw.json');
    if (fs.existsSync(openclawConfigPath)) {
      const oc = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));
      if (oc.agents?.defaults?.graphRAG) {
        Object.assign(config, oc.agents.defaults.graphRAG);
      }
    }
  } catch (err) {
    // ignore config errors
  }

  // Workspace config (optional)
  try {
    const wsConfigPath = path.join(process.cwd(), '.graphragrc.json');
    if (fs.existsSync(wsConfigPath)) {
      const ws = JSON.parse(fs.readFileSync(wsConfigPath, 'utf8'));
      Object.assign(config, ws);
    }
  } catch (err) {
    // ignore config errors
  }

  return config;
}

// ----------------------------------------------------------------------
// Sidecar invocation with timeout and error handling
// ----------------------------------------------------------------------

function callSidecar(args, options = {}) {
  const config = loadConfig();
  const sidecar = config.sidecarPath;
  const timeout = options.timeoutMs || config.timeoutMs;

  return new Promise((resolve, reject) => {
    const child = spawn('node', [sidecar, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (err) {
          reject(new Error(`Sidecar returned invalid JSON: ${err.message}\n${stdout}`));
        }
      } else {
        reject(new Error(`Sidecar failed (code ${code}): ${stderr || 'no output'}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Sidecar spawn error: ${err.message}`));
    });
  });
}

// ----------------------------------------------------------------------
// Health check
// ----------------------------------------------------------------------

async function healthCheck() {
  try {
    const result = await callSidecar(['query', '--question', 'health', '--topK', '1', '--graph', 'false'], { timeoutMs: 5000 });
    return {
      healthy: true,
      version: '0.1.0', // TODO: extract from sidecar
      indexAge: result.debug?.stats?.builtAt ? Date.now() - new Date(result.debug.stats.builtAt).getTime() : null,
    };
  } catch (err) {
    return {
      healthy: false,
      error: err.message,
      lastSeen: Date.now(),
    };
  }
}

// ----------------------------------------------------------------------
// Main retrieval function (for OpenClaw main agent)
// ----------------------------------------------------------------------

async function retrieve(question, options = {}) {
  const config = loadConfig();
  const {
    topK = 8,
    pathContains = '',
    graph = config.graphEnabled,
    seedK = 5,
    expandK = 6,
    minEntityHits = 2,
    maxExpandChars = 2000,
    workspace = process.cwd(),
  } = options;

  const args = [
    'query',
    '--workspace', workspace,
    '--sandboxDir', config.sandboxDir,
    '--index', config.indexId,
    '--question', question,
    '--topK', String(topK),
  ];

  if (pathContains) args.push('--pathContains', pathContains);
  if (graph) {
    args.push('--graph', 'true');
    args.push('--seedK', String(seedK));
    args.push('--expandK', String(expandK));
    args.push('--minEntityHits', String(minEntityHits));
    args.push('--maxExpandChars', String(maxExpandChars));
  }

  try {
    const result = await callSidecar(args, { timeoutMs: config.timeoutMs });
    return {
      success: true,
      data: result,
      source: 'graphrag',
    };
  } catch (err) {
    if (config.fallbackEnabled) {
      // Return fallback structure (main agent should handle baseline retrieval)
      return {
        success: false,
        error: err.message,
        source: 'graphrag',
        fallback: true,
      };
    }
    throw err;
  }
}

// ----------------------------------------------------------------------
// CLI for testing
// ----------------------------------------------------------------------

async function main() {
  const cmd = process.argv[2];

  if (cmd === 'health') {
    const health = await healthCheck();
    console.log(JSON.stringify(health, null, 2));
    return;
  }

  if (cmd === 'retrieve') {
    const question = process.argv[3];
    if (!question) {
      console.error('Usage: graphrag-wrapper retrieve <question>');
      process.exit(1);
    }
    const result = await retrieve(question);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error(`Usage: graphrag-wrapper <command>
Commands:
  health                     Check sidecar health
  retrieve <question>        Retrieve with graph expansion
`);
  process.exit(1);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

// ----------------------------------------------------------------------
// Exports for programmatic use
// ----------------------------------------------------------------------

module.exports = {
  retrieve,
  healthCheck,
  loadConfig,
  callSidecar,
};
