/* global process, fetch, setTimeout */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const baseUrl = "http://127.0.0.1:4173";
let server = null;

async function ready() {
  try {
    const response = await fetch(`${baseUrl}/api/resource-editor/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((done) => server.once("exit", done));
  server.kill();
  await Promise.race([exited, new Promise((done) => setTimeout(done, 2_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

if (!(await ready())) {
  server = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "--mode", "editor-test"], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  for (let attempt = 0; attempt < 60 && !(await ready()); attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Vite editor-test 서버가 종료됐다: ${server.exitCode}`);
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!(await ready())) throw new Error("Vite editor-test 서버가 15초 안에 준비되지 않았다.");
}

const playwright = spawn(process.execPath, [resolve(root, "node_modules/@playwright/test/cli.js"), "test", ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: "1" },
  stdio: "inherit",
  windowsHide: true,
});
const exitCode = await new Promise((done) => playwright.once("exit", (code) => done(code ?? 1)));
await stopServer();
process.exitCode = exitCode;
