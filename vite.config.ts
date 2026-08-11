import { defineConfig } from "vitest/config";

export default defineConfig({
  server: { host: "127.0.0.1", port: 4173 },
  preview: { host: "127.0.0.1", port: 4173 },
  build: { chunkSizeWarningLimit: 600 },
  test: { exclude: ["tests/e2e/**", "node_modules/**", "dist/**"] },
});
