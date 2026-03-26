import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { detectQueryIntent as detectQueryIntentCurrent, detectQueryIntentDetailed } from "../src/policy/query-intent.ts";
import { detectQueryIntentT4Frozen, T4_BASELINE_VERSION } from "./baselines/t4_detector_frozen.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PATHS = {
  replay: path.join(__dirname, "datasets/dev_visible.json"),
  calibration: path.join(__dirname, "datasets/calibration_visible.json"),
  holdoutInputs: path.join(__dirname, "datasets/holdout_blind_inputs.json"),
  holdoutLabels: path.join(__dirname, "datasets/holdout_labels.json"),
  replayReport: path.join(__dirname, "reports/intent_replay_results_2026-03-26.md"),
  calibrationReport: path.join(__dirname, "reports/intent_calibration_results_2026-03-26.md"),
  holdoutReport: path.join(__dirname, "reports/intent_holdout_results_2026-03-26.md"),
  runner: path.join(__dirname, "run-intent-replay-eval.mjs"),
  baseline: path.join(__dirname, "baselines/t4_detector_frozen.mjs"),
  detector: path.join(__dirname, "../src/policy/query-intent.ts"),
};

const INTENTS = ["WHY", "WHEN", "ENTITY", "GENERAL"];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}
function pct(v) {
  return `${(v * 100).toFixed(2)}%`;
}
function fmt(v) {
  return Number(v).toFixed(3);
}
function zeroCounts() {
  return { support: 0, hit: 0, miss: 0, predicted: 0, precision: 0, recall: 0 };
}
function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}
function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function summarizeScoring(detailed) {
  if (!detailed) return null;
  const scoring = detailed.scoring ?? detailed;
  const topScore = Number(scoring.topScore);
  const margin = Number(scoring.margin);
  const minTopScore = Number(scoring.minTopScore ?? Number.NaN);
  const minMargin = Number(scoring.minMargin ?? Number.NaN);

  let decisionReason = scoring.decisionReason;
  if (!decisionReason) {
    if (scoring.decisionIntent === "GENERAL" && Number.isFinite(topScore) && Number.isFinite(minTopScore) && topScore < minTopScore) {
      decisionReason = "low-score";
    } else if (scoring.decisionIntent === "GENERAL" && Number.isFinite(margin) && Number.isFinite(minMargin) && margin < minMargin) {
      decisionReason = "low-margin";
    } else {
      decisionReason = "scored";
    }
  }

  return {
    topIntent: scoring.topIntent,
    decisionIntent: scoring.decisionIntent ?? detailed.intent,
    decisionReason,
    topScore: Number.isFinite(topScore) ? topScore : 0,
    secondScore: Number.isFinite(Number(scoring.secondScore)) ? Number(scoring.secondScore) : 0,
    margin: Number.isFinite(margin) ? margin : 0,
    scores: scoring.scores ?? scoring.rawScores ?? null,
    normalizedScores: scoring.normalizedScores ?? null,
  };
}

function evaluate(dataset, detector, detailProvider = null) {
  const confusion = Object.fromEntries(INTENTS.map((a) => [a, Object.fromEntries(INTENTS.map((p) => [p, 0]))]));
  const stats = Object.fromEntries(INTENTS.map((i) => [i, zeroCounts()]));

  let correct = 0;
  const misclassified = [];
  const scoreRows = [];

  for (const item of dataset) {
    if (!INTENTS.includes(item.expected_intent)) {
      throw new Error(`Invalid expected_intent in item ${item.id}`);
    }

    const predicted = detector(item.query);
    const ok = predicted === item.expected_intent;
    if (ok) correct += 1;
    else misclassified.push({ ...item, predicted });

    confusion[item.expected_intent][predicted] += 1;
    stats[item.expected_intent].support += 1;
    stats[predicted].predicted += 1;

    if (detailProvider) {
      const s = summarizeScoring(detailProvider(item.query));
      if (s) scoreRows.push({ ...item, predicted, correct: ok, ...s });
    }
  }

  for (const i of INTENTS) {
    const tp = confusion[i][i];
    stats[i].hit = tp;
    stats[i].miss = stats[i].support - tp;
    stats[i].precision = safeDiv(tp, stats[i].predicted);
    stats[i].recall = safeDiv(tp, stats[i].support);
  }

  const diagnostics = buildDiagnostics(scoreRows);
  return {
    samples: dataset.length,
    correct,
    accuracy: safeDiv(correct, dataset.length),
    perIntent: stats,
    confusion,
    misclassified,
    misclassifiedCount: misclassified.length,
    scoreDiagnostics: diagnostics,
  };
}

function buildDiagnostics(rows) {
  if (!rows.length) return null;
  const margins = rows.map((r) => r.margin).filter(Number.isFinite);
  const topScores = rows.map((r) => r.topScore).filter(Number.isFinite);
  const threshold = 0.08;
  const low = rows.filter((r) => Number.isFinite(r.margin) && r.margin < threshold);
  const lowErr = low.filter((r) => !r.correct);
  const byReason = {};
  for (const r of rows) {
    const k = r.decisionReason || "unknown";
    if (!byReason[k]) byReason[k] = { total: 0, errors: 0 };
    byReason[k].total += 1;
    if (!r.correct) byReason[k].errors += 1;
  }

  return {
    available: true,
    lowMarginThreshold: threshold,
    margin: {
      min: Math.min(...margins),
      p25: percentile(margins, 25),
      p50: percentile(margins, 50),
      p75: percentile(margins, 75),
      p90: percentile(margins, 90),
      max: Math.max(...margins),
      mean: mean(margins),
    },
    topScore: {
      min: Math.min(...topScores),
      p25: percentile(topScores, 25),
      p50: percentile(topScores, 50),
      p75: percentile(topScores, 75),
      p90: percentile(topScores, 90),
      max: Math.max(...topScores),
      mean: mean(topScores),
    },
    lowMargin: {
      total: low.length,
      errorCount: lowErr.length,
      errorRate: safeDiv(lowErr.length, low.length || 1),
    },
    byReason,
  };
}

function buildComparison(base, curr) {
  const perIntent = {};
  for (const i of INTENTS) {
    perIntent[i] = {
      precisionDeltaPctPoint: (curr.perIntent[i].precision - base.perIntent[i].precision) * 100,
      recallDeltaPctPoint: (curr.perIntent[i].recall - base.perIntent[i].recall) * 100,
      hitDelta: curr.perIntent[i].hit - base.perIntent[i].hit,
      missDelta: curr.perIntent[i].miss - base.perIntent[i].miss,
    };
  }
  return {
    accuracyDeltaPctPoint: (curr.accuracy - base.accuracy) * 100,
    perIntent,
  };
}

function pushMetrics(lines, title, m) {
  lines.push(`## ${title}`);
  lines.push("");
  lines.push(`- Samples: **${m.samples}**`);
  lines.push(`- Correct: **${m.correct}**`);
  lines.push(`- Accuracy: **${pct(m.accuracy)}**`);
  lines.push("");
  lines.push("| Intent | Precision | Recall | Hit | Miss | Support |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const i of INTENTS) {
    const s = m.perIntent[i];
    lines.push(`| ${i} | ${pct(s.precision)} | ${pct(s.recall)} | ${s.hit} | ${s.miss} | ${s.support} |`);
  }
  lines.push("");
  lines.push("| Actual\\Pred | WHY | WHEN | ENTITY | GENERAL |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const a of INTENTS) {
    const r = m.confusion[a];
    lines.push(`| ${a} | ${r.WHY} | ${r.WHEN} | ${r.ENTITY} | ${r.GENERAL} |`);
  }
  lines.push("");
  if (m.scoreDiagnostics?.available) {
    lines.push(`- Margin p50/p90: ${fmt(m.scoreDiagnostics.margin.p50)} / ${fmt(m.scoreDiagnostics.margin.p90)}`);
    lines.push(`- TopScore p50/p90: ${fmt(m.scoreDiagnostics.topScore.p50)} / ${fmt(m.scoreDiagnostics.topScore.p90)}`);
    lines.push(`- Low-margin errors: ${m.scoreDiagnostics.lowMargin.errorCount}/${m.scoreDiagnostics.lowMargin.total}`);
    lines.push("");
  }
}

function hashManifest() {
  const files = [
    PATHS.replay,
    PATHS.calibration,
    PATHS.holdoutInputs,
    PATHS.holdoutLabels,
    PATHS.runner,
    PATHS.baseline,
    PATHS.detector,
  ].filter((p) => fs.existsSync(p));
  return Object.fromEntries(files.map((f) => [path.relative(__dirname, f), sha256(f)]));
}

function reportHeader(title, datasetPath, samples) {
  return [
    `# ${title}`,
    "",
    "## Audit Header",
    `- Dataset: \`${path.relative(__dirname, datasetPath)}\``,
    `- Samples: **${samples}**`,
    `- Baseline detector: **${T4_BASELINE_VERSION}**`,
    `- Baseline hash: \`${sha256(PATHS.baseline)}\``,
    `- Runner hash: \`${sha256(PATHS.runner)}\``,
    `- Current detector hash: \`${sha256(PATHS.detector)}\``,
    "",
  ];
}

function appendHashes(lines) {
  const hashes = hashManifest();
  lines.push("## File Hashes");
  lines.push("| File | sha256 |");
  lines.push("|---|---|");
  for (const [f, h] of Object.entries(hashes)) lines.push(`| ${f} | \`${h}\` |`);
  lines.push("");
}

function evaluateDatasetToReport(dataset, datasetPathForHeader, reportPath, title) {
  const base = evaluate(dataset, detectQueryIntentT4Frozen);
  const curr = evaluate(dataset, detectQueryIntentCurrent, (q) => detectQueryIntentDetailed(q));
  const cmp = buildComparison(base, curr);

  const lines = [...reportHeader(title, datasetPathForHeader, dataset.length)];
  lines.push(`- Accuracy (Baseline -> Current): **${pct(base.accuracy)} -> ${pct(curr.accuracy)} (${cmp.accuracyDeltaPctPoint.toFixed(2)}pp)**`);
  lines.push("");
  pushMetrics(lines, "Baseline Metrics", base);
  pushMetrics(lines, "Current Metrics", curr);

  lines.push("## Delta Summary");
  lines.push("| Intent | ΔPrecision | ΔRecall | ΔHit | ΔMiss |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const i of INTENTS) {
    const d = cmp.perIntent[i];
    lines.push(`| ${i} | ${d.precisionDeltaPctPoint.toFixed(2)}pp | ${d.recallDeltaPctPoint.toFixed(2)}pp | ${d.hitDelta} | ${d.missDelta} |`);
  }
  lines.push("");
  appendHashes(lines);

  ensureDir(reportPath);
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  return { samples: dataset.length, baseline: base, current: curr, comparison: cmp, reportPath };
}

function holdoutDataset() {
  if (!fs.existsSync(PATHS.holdoutInputs) || !fs.existsSync(PATHS.holdoutLabels)) return null;
  const inputs = JSON.parse(fs.readFileSync(PATHS.holdoutInputs, "utf8"));
  const labels = JSON.parse(fs.readFileSync(PATHS.holdoutLabels, "utf8"));
  const map = new Map(labels.map((x) => [x.id, x.expected_intent]));
  return inputs.filter((x) => map.has(x.id)).map((x) => ({ id: x.id, query: x.query, expected_intent: map.get(x.id) }));
}

function evaluateOne(datasetPath, reportPath, title) {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  return evaluateDatasetToReport(dataset, datasetPath, reportPath, title);
}

function evaluateHoldout() {
  const d = holdoutDataset();
  if (!d || !d.length) return null;
  return evaluateDatasetToReport(d, PATHS.holdoutInputs, PATHS.holdoutReport, "Intent Holdout Evaluation Results (2026-03-26)");
}

function main() {
  const replay = evaluateOne(PATHS.replay, PATHS.replayReport, "Intent Replay Evaluation Results (2026-03-26)");
  const calibration = evaluateOne(PATHS.calibration, PATHS.calibrationReport, "Intent Calibration Evaluation Results (2026-03-26)");
  const holdout = evaluateHoldout();

  const summary = {
    replay,
    calibration,
    holdout,
    audit: {
      baselineVersion: T4_BASELINE_VERSION,
      hashes: hashManifest(),
      gate: {
        minGeneralRecall: 0.7,
        minAccuracyVsBaselineDelta: -0.01,
        replayGeneralRecall: replay.current.perIntent.GENERAL.recall,
        replayAccuracyDelta: replay.current.accuracy - replay.baseline.accuracy,
      },
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote report: ${PATHS.replayReport}`);
  console.log(`Wrote report: ${PATHS.calibrationReport}`);
  if (holdout) console.log(`Wrote report: ${PATHS.holdoutReport}`);
}

main();
