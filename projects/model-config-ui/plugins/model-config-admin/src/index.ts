import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { registerModelConfigAdminRoutes } from "./routes.js";

const plugin = {
  id: "model-config-admin",
  name: "Model Config Admin",
  description: "Admin UI + APIs for model/provider config + benchmark runs (MVP-1)",
  register(api: OpenClawPluginApi) {
    registerModelConfigAdminRoutes(api);
  },
};

export default plugin;
