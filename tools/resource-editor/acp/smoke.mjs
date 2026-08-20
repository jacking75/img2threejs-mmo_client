/* global process, setTimeout, clearTimeout */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { Readable, Writable } from "node:stream";
import { ClientSideConnection, PROTOCOL_VERSION, ndJsonStream } from "@agentclientprotocol/sdk";

const workspaceRoot = process.cwd();
const entry = resolve(workspaceRoot, "node_modules/@agentclientprotocol/codex-acp/dist/index.js");
const child = spawn(process.execPath, [entry], {
  cwd: workspaceRoot,
  env: { ...process.env, INITIAL_AGENT_MODE: "read-only", NO_BROWSER: "1" },
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});
const stream = ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout));
const connection = new ClientSideConnection(() => ({
  requestPermission: async () => ({ outcome: { outcome: "cancelled" } }),
  sessionUpdate: async () => undefined,
}), stream);
const timer = setTimeout(() => child.kill(), 15_000);

try {
  const initialized = await connection.initialize({
    protocolVersion: PROTOCOL_VERSION,
    clientCapabilities: { terminal: false },
    clientInfo: { name: "resource-editor-smoke", version: "0.1.0" },
  });
  if (initialized.protocolVersion !== PROTOCOL_VERSION) throw new Error(`ACP version mismatch: ${initialized.protocolVersion}`);
  process.stdout.write(`${JSON.stringify({ ok: true, protocolVersion: initialized.protocolVersion, agentInfo: initialized.agentInfo, authMethods: initialized.authMethods?.map((method) => method.id) ?? [] })}\n`);
} finally {
  clearTimeout(timer);
  child.stdin.end();
  child.kill();
}
