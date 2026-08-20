import type { Plugin } from "vite";
import { ResourceEditorServer } from "./server";

export function resourceEditorPlugin(options: { readonly fakeAgent?: boolean } = {}): Plugin {
  return {
    name: "resource-editor-local-host",
    apply: "serve",
    configureServer(server) {
      const configuredHost = String(server.config.server.host ?? "localhost");
      if (configuredHost !== "127.0.0.1" && configuredHost !== "localhost") {
        throw new Error("Resource Editor 호스트는 127.0.0.1 또는 localhost에만 바인딩할 수 있다.");
      }
      const host = new ResourceEditorServer(server.config.root, Boolean(options.fakeAgent));
      server.middlewares.use((request, response, next) => {
        void host.handle(request, response).then((handled) => { if (!handled) next(); }).catch(next);
      });
      server.watcher.once("close", () => { void host.dispose(); });
      server.httpServer?.once("close", () => { void host.dispose(); });
    },
  };
}
