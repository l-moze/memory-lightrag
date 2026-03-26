import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { detectQueryIntent } from "../src/policy/query-intent.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PATH = path.join(__dirname, "intent_replay_dataset_2026-03-26.json");
const REPORT_PATH = path.join(__dirname, "intent_replay_results_2026-03-26.md");

const INTENTS = ["WHY", "WHEN", "ENTITY", "GENERAL"];

function zeroCounts() {
  return { support: 0, hit: 0, miss: 0, predicted: 0, precision: 0, recall: 0 };
}

function safeDiv(n, d) {
  return d === 0 ? 0 : n / d;
}

function pct(v) {
  return `${(v * 100).toFixed(2)}%`;
}

function main() {
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  const confusion = Object.fromEntries(
    INTENTS.map((actual) => [actual, Object.fromEntries(INTENTS.map((pred) => [pred, 0]))]),
  );
  const stats = Object.fromEntries(INTENTS.map((i) => [i, zeroCounts()]));

  const rows = [];
  let correct = 0;

  for (const item of dataset) {
    const actual = item.expected_intent;
    const predicted = detectQueryIntent(item.query);

    rows.push({ ...item, predicted, correct: actual === predicted });

    if (actual === predicted) correct += 1;

    if (!confusion[actual]) {
      throw new Error(`Unknown expected_intent '${actual}' in dataset item ${item.id}`);
    }

    confusion[actual][predicted] += 1;
    stats[actual].support += 1;
    stats[predicted].predicted += 1;
  }

  for (const intent of INTENTS) {
    const tp = confusion[intent][intent];
    const support = stats[intent].support;
    const predicted = stats[intent].predicted;
    const miss = support - tp;

    stats[intent].hit = tp;
    stats[intent].miss = miss;
    stats[intent].precision = safeDiv(tp, predicted);
    stats[intent].recall = safeDiv(tp, support);
  }

  const accuracy = safeDiv(correct, dataset.length);
  const misclassified = rows.filter((r) => !r.correct);

  const summary = {
    samples: dataset.length,
    correct,
    accuracy,
    perIntent: stats,
    confusion,
    misclassifiedCount: misclassified.length,
  };

  const lines = [];
  lines.push("# Intent Replay Evaluation Results (2026-03-26)");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Dataset: \`eval/intent_replay_dataset_2026-03-26.json\``);
  lines.push(`- Samples: **${dataset.length}**`);
  lines.push(`- Correct: **${correct}**`);
  lines.push(`- Overall accuracy: **${pct(accuracy)}**`);
  lines.push(`- Misclassified: **${misclassified.length}**`);
  lines.push("");

  lines.push("## Per-intent Metrics");
  lines.push("");
  lines.push("| Intent | Support | Predicted | Hit | Miss | Precision | Recall |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const intent of INTENTS) {
    const s = stats[intent];
    lines.push(
      `| ${intent} | ${s.support} | ${s.predicted} | ${s.hit} | ${s.miss} | ${pct(s.precision)} | ${pct(s.recall)} |`,
    );
  }
  lines.push("");

  lines.push("## Confusion Matrix (actual -> predicted)");
  lines.push("");
  lines.push("| Actual \\ Pred | WHY | WHEN | ENTITY | GENERAL |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const actual of INTENTS) {
    const row = confusion[actual];
    lines.push(`| ${actual} | ${row.WHY} | ${row.WHEN} | ${row.ENTITY} | ${row.GENERAL} |`);
  }
  lines.push("");

  lines.push("## Top Misclassified Cases");
  lines.push("");
  if (misclassified.length === 0) {
    lines.push("No misclassifications found.");
  } else {
    const top = misclassified.slice(0, 12);
    lines.push("| ID | Expected | Predicted | Query |");
    lines.push("|---|---|---|---|");
    for (const m of top) {
      const q = String(m.query).replace(/\|/g, "\\|");
      lines.push(`| ${m.id} | ${m.expected_intent} | ${m.predicted} | ${q} |`);
    }
  }
  lines.push("");

  fs.writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nWrote report: ${REPORT_PATH}`);
}

main();
