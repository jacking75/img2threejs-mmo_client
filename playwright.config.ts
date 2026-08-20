import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
    command: "node node_modules/vite/bin/vite.js --mode editor-test",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
