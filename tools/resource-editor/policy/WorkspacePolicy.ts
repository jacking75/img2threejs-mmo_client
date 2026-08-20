import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const DEFAULT_WRITE_ROOTS = [
  "src/assets",
  "tests/assets",
  "docs_working/IMPLEMENTATION_PLAN.md",
  "working_log.md",
] as const;

export const VALIDATION_COMMANDS = {
  focused: { command: "npm.cmd", args: ["run", "test", "--"] },
  lint: { command: "npm.cmd", args: ["run", "lint"] },
  unit: { command: "npm.cmd", args: ["run", "test"] },
  build: { command: "npm.cmd", args: ["run", "build"] },
  e2e: { command: "npm.cmd", args: ["run", "test:e2e"] },
} as const;

function isWithin(root: string, candidate: string): boolean {
  const segment = relative(root, candidate);
  return segment === "" || (!segment.startsWith(`..${sep}`) && segment !== ".." && !isAbsolute(segment));
}

export class WorkspacePolicy {
  public readonly workspaceRoot: string;
  private readonly allowedRoots: readonly string[];

  public constructor(workspaceRoot: string, allowedRoots: readonly string[] = DEFAULT_WRITE_ROOTS) {
    this.workspaceRoot = resolve(workspaceRoot);
    this.allowedRoots = allowedRoots.map((root) => resolve(this.workspaceRoot, root));
  }

  public resolveReadablePath(requestedPath: string): string {
    const candidate = resolve(this.workspaceRoot, requestedPath);
    if (!isWithin(this.workspaceRoot, candidate)) throw new Error("워크스페이스 밖 경로는 읽을 수 없다.");
    return candidate;
  }

  public resolveWritablePath(requestedPath: string): string {
    const candidate = this.resolveReadablePath(requestedPath);
    if (!this.allowedRoots.some((root) => isWithin(root, candidate))) {
      throw new Error(`허용된 쓰기 범위 밖 경로다: ${requestedPath}`);
    }
    return candidate;
  }

  public async assertNoSymlinkEscape(requestedPath: string, writable: boolean): Promise<string> {
    const candidate = writable ? this.resolveWritablePath(requestedPath) : this.resolveReadablePath(requestedPath);
    let existing = candidate;
    while (true) {
      try {
        await stat(existing);
        break;
      } catch {
        const parent = resolve(existing, "..");
        if (parent === existing || !isWithin(this.workspaceRoot, parent)) throw new Error("검증 가능한 상위 경로가 없다.");
        existing = parent;
      }
    }
    const realExisting = await realpath(existing);
    const realRoot = await realpath(this.workspaceRoot);
    if (!isWithin(realRoot, realExisting)) throw new Error("심볼릭 링크가 워크스페이스 밖을 가리킨다.");
    return candidate;
  }

  public validationCommand(id: keyof typeof VALIDATION_COMMANDS, focusedFiles: readonly string[] = []): { command: string; args: string[] } {
    const definition = VALIDATION_COMMANDS[id];
    if (id !== "focused") return { command: definition.command, args: [...definition.args] };
    const files = focusedFiles.map((file) => this.resolveReadablePath(file));
    return { command: definition.command, args: [...definition.args, ...files] };
  }

  public isAllowedValidationCommand(command: string): boolean {
    if (/[|&;><`\r\n]/.test(command)) return false;
    const normalized = command.trim().replaceAll(/\s+/g, " ").replace(/^npm\.cmd /i, "npm ");
    if (/^npm run (lint|build|test:e2e)$/.test(normalized)) return true;
    if (normalized === "npm run test") return true;
    if (!normalized.startsWith("npm run test -- ")) return false;
    const paths = normalized.slice("npm run test -- ".length).split(" ");
    return paths.length > 0 && paths.every((path) => /^tests\/assets\/[A-Za-z0-9._-]+\.test\.ts$/.test(path.replaceAll("\\", "/")));
  }
}
