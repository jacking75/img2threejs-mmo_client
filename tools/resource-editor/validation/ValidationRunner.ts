import { spawn } from "node:child_process";
import type { EditorHostEvent, ValidationTarget } from "../../../src/dev/resource-editor/editorTypes";
import type { WorkspacePolicy } from "../policy/WorkspacePolicy";

export class ValidationRunner {
  public constructor(private readonly policy: WorkspacePolicy, private readonly emit: (event: EditorHostEvent) => void) {}

  public async run(requestId: string, targets: readonly ValidationTarget[], focusedTests: readonly string[], signal: AbortSignal): Promise<boolean> {
    for (const target of targets) {
      if (signal.aborted) return false;
      const started = performance.now();
      this.emit({ type: "validation", requestId, result: { id: target.id, label: target.label, status: "running" } });
      const command = this.policy.validationCommand(target.id, target.id === "focused" ? focusedTests : []);
      const result = await this.exec(command.command, command.args, signal);
      const durationMs = Math.round(performance.now() - started);
      this.emit({
        type: "validation",
        requestId,
        result: { id: target.id, label: target.label, status: result.cancelled ? "cancelled" : result.code === 0 ? "passed" : "failed", durationMs, output: result.output.slice(-4_000) },
      });
      if (result.code !== 0) return false;
    }
    return true;
  }

  private exec(command: string, args: readonly string[], signal: AbortSignal): Promise<{ code: number; output: string; cancelled: boolean }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, { cwd: this.policy.workspaceRoot, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      let output = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => { output += chunk; });
      child.stderr.on("data", (chunk: string) => { output += chunk; });
      const abort = (): void => { child.kill(); };
      signal.addEventListener("abort", abort, { once: true });
      child.once("error", (error) => {
        signal.removeEventListener("abort", abort);
        resolve({ code: 1, output: `${output}\n${error.message}`, cancelled: signal.aborted });
      });
      child.once("exit", (code) => {
        signal.removeEventListener("abort", abort);
        resolve({ code: code ?? 1, output, cancelled: signal.aborted });
      });
    });
  }
}
