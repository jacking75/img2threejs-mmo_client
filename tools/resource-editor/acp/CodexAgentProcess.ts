import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolve } from "node:path";

export type AgentMode = "read-only" | "agent";

export class CodexAgentProcess {
  private child: ChildProcessWithoutNullStreams | null = null;

  public constructor(private readonly workspaceRoot: string, private readonly onStderr: (message: string) => void = () => undefined) {}

  public start(mode: AgentMode): ChildProcessWithoutNullStreams {
    if (this.child) throw new Error("codex-acp 프로세스가 이미 실행 중이다.");
    const entry = resolve(this.workspaceRoot, "node_modules/@agentclientprotocol/codex-acp/dist/index.js");
    const child = spawn(process.execPath, [entry], {
      cwd: this.workspaceRoot,
      env: {
        ...process.env,
        INITIAL_AGENT_MODE: mode,
        APP_SERVER_LOGS: resolve(this.workspaceRoot, ".resource-editor-cache/logs"),
      },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      const sanitized = chunk.replaceAll(/(?:CODEX|OPENAI)_API_KEY\s*=\s*\S+/gi, "API_KEY=[REDACTED]").trim();
      if (sanitized) this.onStderr(sanitized.slice(0, 2_000));
    });
    child.once("exit", () => { if (this.child === child) this.child = null; });
    this.child = child;
    return child;
  }

  public async stop(): Promise<void> {
    const child = this.child;
    if (!child) return;
    this.child = null;
    child.stdin.end();
    if (child.exitCode !== null) return;
    const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
    child.kill();
    await Promise.race([exited, new Promise<void>((resolveTimeout) => setTimeout(resolveTimeout, 2_000))]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}
