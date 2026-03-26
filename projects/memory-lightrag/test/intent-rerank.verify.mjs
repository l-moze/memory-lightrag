import assert from "node:assert/strict";

import { detectQueryIntent } from "../src/policy/query-intent.ts";
import { getRerankWeights } from "../src/policy/rerank-policy.ts";

const classificationCases = [
  { query: "why did the deployment fail", expected: "WHY" },
  { query: "为什么昨天接口变慢", expected: "WHY" },
  { query: "when was this task finished", expected: "WHEN" },
  { query: "这个问题是什么时候出现的", expected: "WHEN" },
  { query: "who owns this project", expected: "ENTITY" },
  { query: "哪个团队负责这个文档", expected: "ENTITY" },
  { query: "summarize the latest update", expected: "GENERAL" },
  { query: "", expected: "GENERAL" },
];

for (const { query, expected } of classificationCases) {
  const actual = detectQueryIntent(query);
  assert.equal(
    actual,
    expected,
    `detectQueryIntent(${JSON.stringify(query)}) expected ${expected}, got ${actual}`,
  );
}

const intents = ["WHY", "WHEN", "ENTITY", "GENERAL"];

function assertFiniteWeights(intent, weights) {
  for (const [key, value] of Object.entries(weights)) {
    assert.equal(typeof value, "number", `${intent}.${key} must be a number`);
    assert.ok(Number.isFinite(value), `${intent}.${key} must be finite`);
  }
}

for (const intent of intents) {
  const weights = getRerankWeights(intent);
  assertFiniteWeights(intent, weights);
}

const why = getRerankWeights("WHY");
assert.ok(why.causal > why.temporal, "WHY should emphasize causal over temporal");
assert.ok(why.causal > why.entity, "WHY should emphasize causal over entity");

const when = getRerankWeights("WHEN");
assert.ok(when.temporal > when.causal, "WHEN should emphasize temporal over causal");
assert.ok(when.temporal > when.entity, "WHEN should emphasize temporal over entity");

const entity = getRerankWeights("ENTITY");
assert.ok(entity.entity > entity.causal, "ENTITY should emphasize entity over causal");
assert.ok(entity.entity > entity.temporal, "ENTITY should emphasize entity over temporal");

const general = getRerankWeights("GENERAL");
assert.equal(general.causal, general.temporal, "GENERAL should keep balanced weights");
assert.equal(general.temporal, general.entity, "GENERAL should keep balanced weights");
assert.equal(general.entity, general.lexical, "GENERAL should keep balanced weights");
assert.equal(general.lexical, general.semantic, "GENERAL should keep balanced weights");

console.log("intent-rerank.verify: OK");
console.log(`- classification cases: ${classificationCases.length}`);
console.log(`- rerank intents checked: ${intents.length}`);
