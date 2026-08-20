import { defineConfig } from "vitest/config";
import { resourceEditorPlugin } from "./tools/resource-editor/vitePlugin";

export default defineConfig(({ mode }) => ({
  plugins: mode === "editor" || mode === "editor-test"
    ? [resourceEditorPlugin({ fakeAgent: mode === "editor-test" })]
    : [],
  server: { host: "127.0.0.1", port: 4173 },
  preview: { host: "127.0.0.1", port: 4173 },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (normalizedId.includes("node_modules/three/examples/jsm/")) {
            return "vendor-three-addons";
          }
          if (normalizedId.includes("node_modules/three/")) return "vendor-three";
        },
      },
    },
  },
  test: { exclude: ["tests/e2e/**", "node_modules/**", "dist/**"] },
}));
