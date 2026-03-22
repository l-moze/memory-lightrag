import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { parseLightragConfig } from "./config/schema.js";
import { LightragAdapter } from "./adapter/lightrag.js";
import { clampTopK } from "./policy/budget.js";

export default definePluginEntry({
  id: "memory-lightrag",
  name: "Memory (LightRAG)",
  description: "LightRAG-backed memory plugin scaffold (v1)",
  kind: "memory",
  register(api) {
    const cfg = parseLightragConfig(api.pluginConfig);
    const adapter = new LightragAdapter(cfg);

    api.registerCli(
      ({ program }) => {
        const memory = program.command("memory").description("Memory operations");

        memory
          .command("status")
          .description("Check memory backend status")
          .action(async () => {
            const status = await adapter.checkHealth();
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(status, null, 2));
          });

        memory
          .command("search <query>")
          .description("Search memory backend")
          .option("--top-k <n>", "Top-K results")
          .action(async (query: string, opts: { topK?: string }) => {
            const topK = clampTopK(Number(opts.topK ?? cfg.recallTopK), cfg.recallTopK);
            const result = await adapter.search(query, topK);
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(result, null, 2));
          });
      },
      { commands: ["memory"] },
    );
  },
});
