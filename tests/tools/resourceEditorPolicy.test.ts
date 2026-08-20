import { describe, expect, it, vi } from "vitest";
import { ApprovalBroker } from "../../tools/resource-editor/policy/ApprovalBroker";
import { WorkspacePolicy } from "../../tools/resource-editor/policy/WorkspacePolicy";

describe("resource editor workspace policy", () => {
  const policy = new WorkspacePolicy(process.cwd());

  it("워크스페이스와 쓰기 allowlist 밖 경로를 거부한다", () => {
    expect(policy.resolveReadablePath("src/assets/catalog.ts")).toContain("src");
    expect(() => policy.resolveReadablePath("../outside.txt")).toThrow(/워크스페이스 밖/);
    expect(() => policy.resolveWritablePath("src/main.ts")).toThrow(/쓰기 범위 밖/);
    expect(policy.resolveWritablePath("src/assets/catalog.ts")).toContain("catalog.ts");
  });

  it("검증 명령을 argv registry에서만 만든다", () => {
    const command = policy.validationCommand("focused", ["tests/assets/faunaResources.test.ts"]);
    expect(command.command).toBe("npm.cmd");
    expect(command.args.slice(0, 3)).toEqual(["run", "test", "--"]);
    expect(command.args.at(-1)).toMatch(/faunaResources\.test\.ts$/);
    expect(policy.isAllowedValidationCommand("npm run lint")).toBe(true);
    expect(policy.isAllowedValidationCommand("npm.cmd run test -- tests/assets/faunaResources.test.ts")).toBe(true);
    expect(policy.isAllowedValidationCommand("npm run test | echo secret")).toBe(false);
    expect(policy.isAllowedValidationCommand("npm install package")).toBe(false);
  });
});

describe("resource editor approval broker", () => {
  it("한 번 선택한 승인만 해결하고 만료는 기본 거부한다", async () => {
    vi.useFakeTimers();
    const broker = new ApprovalBroker(25);
    const first = broker.request({ approvalId: "a1", requestId: "r1", reason: "edit", target: "file", options: [{ optionId: "once", label: "허용", kind: "allow_once" }] });
    expect(broker.decide("a1", "once")).toBe(true);
    await expect(first).resolves.toBe("once");
    const expired = broker.request({ approvalId: "a2", requestId: "r1", reason: "edit", target: "file", options: [] });
    await vi.advanceTimersByTimeAsync(30);
    await expect(expired).resolves.toBeNull();
    vi.useRealTimers();
  });
});
