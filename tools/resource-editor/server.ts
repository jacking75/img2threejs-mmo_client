import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { relative, resolve } from "node:path";
import { promisify } from "node:util";
import type { EditorHostEvent, ResourceEditRequest, ValidationTarget } from "../../src/dev/resource-editor/editorTypes";
import { AcpClient } from "./acp/AcpClient";
import { ApprovalBroker } from "./policy/ApprovalBroker";
import { WorkspacePolicy } from "./policy/WorkspacePolicy";
import { ValidationRunner } from "./validation/ValidationRunner";

const execFileAsync = promisify(execFile);
const API_PREFIX = "/api/resource-editor";

interface JsonRecord { readonly [key: string]: unknown }

function json(response: ServerResponse, status: number, body: JsonRecord): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage, maxBytes = 8_000_000): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > maxBytes) throw new Error("요청 본문 크기 제한을 초과했다.");
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON 객체가 필요하다.");
  return parsed as JsonRecord;
}

function safeRequest(value: unknown): value is ResourceEditRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<ResourceEditRequest>;
  return typeof request.requestId === "string"
    && typeof request.instruction === "string"
    && (request.mode === "plan" || request.mode === "apply")
    && Boolean(request.selection && typeof request.selection.assetId === "string")
    && Array.isArray(request.selection?.sourceFiles);
}

export class ResourceEditorServer {
  private readonly token = randomBytes(24).toString("hex");
  private readonly clients = new Set<ServerResponse>();
  private readonly policy: WorkspacePolicy;
  private readonly approvals = new ApprovalBroker();
  private readonly validation: ValidationRunner;
  private readonly active = new Map<string, AbortController>();
  private readonly acpClients = new Map<string, AcpClient>();
  private latestSessionId: string | undefined;

  public constructor(private readonly workspaceRoot: string, private readonly fakeAgent = false) {
    this.policy = new WorkspacePolicy(workspaceRoot);
    this.validation = new ValidationRunner(this.policy, (event) => this.broadcast(event));
  }

  public async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    if (!url.pathname.startsWith(API_PREFIX)) return false;
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    if (!this.validOrigin(request)) {
      json(response, 403, { error: "same-origin 로컬 요청만 허용한다." });
      return true;
    }
    try {
      if (request.method === "GET" && url.pathname === `${API_PREFIX}/health`) {
        json(response, 200, { ok: true, sessionToken: this.token, agent: this.active.size ? "connecting" : "idle", sessionId: this.latestSessionId, protocol: "ACP v1", adapterVersion: "1.3.0", fakeAgent: this.fakeAgent });
        return true;
      }
      const suppliedToken = request.headers["x-resource-editor-token"] ?? url.searchParams.get("token");
      if (suppliedToken !== this.token) {
        json(response, 401, { error: "편집 세션 토큰이 유효하지 않다." });
        return true;
      }
      if (request.method === "GET" && url.pathname === `${API_PREFIX}/events`) {
        this.openEvents(response);
        return true;
      }
      if (request.method === "POST" && url.pathname === `${API_PREFIX}/captures`) {
        const body = await readJson(request);
        const capturePath = await this.saveCapture(String(body.assetId ?? "asset"), String(body.dataUrl ?? ""));
        json(response, 201, { capturePath });
        return true;
      }
      if (request.method === "POST" && url.pathname === `${API_PREFIX}/requests`) {
        const body = await readJson(request);
        if (!safeRequest(body)) throw new Error("편집 요청 계약이 올바르지 않다.");
        this.validateSelection(body);
        if (this.active.has(body.requestId)) throw new Error("중복 요청 ID다.");
        const controller = new AbortController();
        this.active.set(body.requestId, controller);
        void this.run(body, controller).finally(() => {
          this.active.delete(body.requestId);
          this.acpClients.delete(body.requestId);
        });
        json(response, 202, { accepted: true, requestId: body.requestId });
        return true;
      }
      const approvalMatch = url.pathname.match(new RegExp(`^${API_PREFIX}/approvals/([^/]+)$`));
      if (request.method === "POST" && approvalMatch) {
        const body = await readJson(request);
        const ok = this.approvals.decide(decodeURIComponent(approvalMatch[1] ?? ""), typeof body.optionId === "string" ? body.optionId : null);
        json(response, ok ? 200 : 404, ok ? { decided: true } : { error: "만료됐거나 존재하지 않는 승인 요청이다." });
        return true;
      }
      const cancelMatch = url.pathname.match(new RegExp(`^${API_PREFIX}/requests/([^/]+)/cancel$`));
      if (request.method === "POST" && cancelMatch) {
        const requestId = decodeURIComponent(cancelMatch[1] ?? "");
        const controller = this.active.get(requestId);
        controller?.abort();
        await this.acpClients.get(requestId)?.cancel();
        this.broadcast({ type: "status", requestId, status: "cancelled", message: "사용자가 요청을 취소했다." });
        json(response, controller ? 200 : 404, controller ? { cancelled: true } : { error: "실행 중인 요청이 없다." });
        return true;
      }
      const validateMatch = url.pathname.match(new RegExp(`^${API_PREFIX}/requests/([^/]+)/validate$`));
      if (request.method === "POST" && validateMatch) {
        const body = await readJson(request);
        const requestId = decodeURIComponent(validateMatch[1] ?? "");
        const targets = Array.isArray(body.targets) ? body.targets as unknown as ValidationTarget[] : [];
        const focusedTests = Array.isArray(body.focusedTests) ? body.focusedTests.filter((value): value is string => typeof value === "string") : [];
        const controller = new AbortController();
        void this.validation.run(requestId, targets, focusedTests, controller.signal);
        json(response, 202, { accepted: true });
        return true;
      }
      json(response, 404, { error: "지원하지 않는 편집 호스트 경로다." });
      return true;
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : "편집 호스트 요청에 실패했다." });
      return true;
    }
  }

  public async dispose(): Promise<void> {
    for (const controller of this.active.values()) controller.abort();
    await Promise.all([...this.acpClients.values()].map((client) => client.cancel()));
    this.approvals.cancelAll();
    for (const client of this.clients) client.end();
    this.clients.clear();
  }

  private validOrigin(request: IncomingMessage): boolean {
    const host = request.headers.host?.toLowerCase() ?? "";
    const hostname = host.split(":")[0];
    if (hostname !== "127.0.0.1" && hostname !== "localhost") return false;
    const origin = request.headers.origin;
    if (!origin) return true;
    try {
      const parsed = new URL(origin);
      return parsed.host.toLowerCase() === host && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
    } catch {
      return false;
    }
  }

  private openEvents(response: ServerResponse): void {
    response.statusCode = 200;
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.write("retry: 1500\n\n");
    this.clients.add(response);
    response.once("close", () => this.clients.delete(response));
    this.send(response, { type: "connected", agent: this.active.size ? "connecting" : "idle", sessionId: this.latestSessionId });
  }

  private send(response: ServerResponse, event: EditorHostEvent): void {
    response.write(`event: editor\ndata: ${JSON.stringify(event)}\n\n`);
  }

  private broadcast(event: EditorHostEvent): void {
    for (const client of this.clients) this.send(client, event);
  }

  private async saveCapture(assetId: string, dataUrl: string): Promise<string> {
    const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error("PNG data URL만 캡처로 저장할 수 있다.");
    const bytes = Buffer.from(match[1] ?? "", "base64");
    if (!bytes.length || bytes.length > 6_000_000) throw new Error("캡처 크기가 허용 범위를 벗어났다.");
    const cacheRoot = resolve(this.workspaceRoot, ".resource-editor-cache/captures");
    await mkdir(cacheRoot, { recursive: true });
    const slug = assetId.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
    const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    const file = resolve(cacheRoot, `${Date.now()}-${slug}-${digest}.png`);
    await writeFile(file, bytes, { flag: "wx" });
    return relative(this.workspaceRoot, file).replaceAll("\\", "/");
  }

  private validateSelection(request: ResourceEditRequest): void {
    if (!assetIdPattern(request.selection.assetId)) throw new Error("assetId 형식이 올바르지 않다.");
    request.selection.sourceFiles.forEach((file) => this.policy.resolveReadablePath(file));
    request.selection.focusedTests.forEach((file) => this.policy.resolveReadablePath(file));
    request.allowedWriteRoots.forEach((root) => this.policy.resolveWritablePath(root));
  }

  private async run(request: ResourceEditRequest, controller: AbortController): Promise<void> {
    try {
      if (request.mode === "apply") await this.assertTargetsClean(request.selection.sourceFiles);
      if (this.fakeAgent) {
        await this.runFake(request, controller.signal);
        return;
      }
      this.broadcast({ type: "status", requestId: request.requestId, status: request.mode === "plan" ? "planning" : "applying", message: request.mode === "plan" ? "Codex가 읽기 전용 변경 계획을 작성한다." : "승인된 범위에서 Codex 적용 세션을 시작한다." });
      const acp = new AcpClient(this.workspaceRoot, this.policy, this.approvals, (event) => this.broadcast(event));
      this.acpClients.set(request.requestId, acp);
      const result = await acp.run(request, controller.signal);
      this.latestSessionId = result.sessionId;
      this.broadcast({ type: "connected", agent: "ready", sessionId: result.sessionId });
      if (controller.signal.aborted || result.stopReason === "cancelled") {
        this.broadcast({ type: "status", requestId: request.requestId, status: "cancelled", message: "ACP 요청이 취소됐다." });
        return;
      }
      if (request.mode === "plan") {
        this.broadcast({ type: "status", requestId: request.requestId, status: "awaiting-approval", message: "읽기 전용 계획이 완료됐다. 파일은 변경되지 않았다." });
        return;
      }
      await this.emitDiffs(request);
      this.broadcast({ type: "status", requestId: request.requestId, status: "reloading", message: "Vite HMR 뒤 같은 리소스·부품·카메라를 복원한다." });
      this.broadcast({ type: "status", requestId: request.requestId, status: "verifying", message: "관련 테스트부터 품질 gate를 실행한다." });
      const passed = await this.validation.run(request.requestId, request.validation, request.selection.focusedTests, controller.signal);
      this.broadcast({ type: "status", requestId: request.requestId, status: passed ? "completed" : "failed", message: passed ? "적용과 검증이 완료됐다." : "검증이 실패했다. 변경 내용은 자동으로 되돌리지 않았다." });
    } catch (error) {
      this.broadcast({ type: "error", requestId: request.requestId, message: error instanceof Error ? error.message : "편집 요청 실행에 실패했다." });
      this.broadcast({ type: "status", requestId: request.requestId, status: controller.signal.aborted ? "cancelled" : "failed", message: controller.signal.aborted ? "요청이 취소됐다." : "오류를 확인한 뒤 재시도할 수 있다." });
    }
  }

  private async runFake(request: ResourceEditRequest, signal: AbortSignal): Promise<void> {
    const part = request.selection.part?.nodeName ?? "전체 리소스";
    this.broadcast({ type: "status", requestId: request.requestId, status: request.mode === "plan" ? "planning" : "applying", message: "결정론적 fake ACP agent가 요청을 처리한다." });
    this.broadcast({ type: "message", requestId: request.requestId, role: "agent", text: `${request.selection.assetId}의 ${part}을 대상으로 ${request.selection.sourceFiles.join(", ")} 소유 파일을 확인했다.` });
    if (request.mode === "plan") {
      this.broadcast({ type: "plan", requestId: request.requestId, entries: [
        { content: `${part}의 현재 transform과 bounds를 소스 팩토리와 대조한다.`, status: "completed" },
        { content: `${request.selection.sourceFiles[0] ?? "소유 소스"}의 명명 부품 파라미터만 조정한다.`, status: "pending" },
        { content: `${request.selection.focusedTests[0] ?? "관련 테스트"}부터 검증한다.`, status: "pending" },
      ] });
      this.latestSessionId = request.sessionId ?? `fake-${request.requestId}`;
      this.broadcast({ type: "status", requestId: request.requestId, status: "awaiting-approval", message: "읽기 전용 계획이 완료됐다. tracked 파일은 변경되지 않았다." });
      return;
    }
    const approvalId = crypto.randomUUID();
    const wait = this.approvals.request({
      approvalId,
      requestId: request.requestId,
      reason: "선택 리소스 팩토리 수정",
      target: request.selection.sourceFiles[0] ?? "src/assets",
      options: [{ optionId: "allow-once", label: "이번 요청 허용", kind: "allow_once" }],
    });
    const approval = this.approvals.get(approvalId);
    if (approval) this.broadcast({ type: "approval", requestId: request.requestId, approval });
    const decision = await wait;
    if (!decision || signal.aborted) {
      this.broadcast({ type: "status", requestId: request.requestId, status: "cancelled", message: "적용 권한이 거부되거나 요청이 취소됐다." });
      return;
    }
    this.broadcast({ type: "tool", requestId: request.requestId, title: "apply_patch · fake fixture", status: "completed", kind: "edit" });
    this.broadcast({ type: "diff", requestId: request.requestId, file: request.selection.sourceFiles[0] ?? "fixture.ts", patch: `@@ ${part}\n- 기존 절차형 파라미터\n+ 승인된 절차형 파라미터` });
    this.broadcast({ type: "status", requestId: request.requestId, status: "reloading", message: "HMR 상태 복원을 시뮬레이션한다." });
    this.broadcast({ type: "status", requestId: request.requestId, status: "verifying", message: "결정론적 fake 검증을 실행한다." });
    request.validation.forEach((target) => this.broadcast({ type: "validation", requestId: request.requestId, result: { id: target.id, label: target.label, status: "passed", durationMs: 12 } }));
    this.broadcast({ type: "status", requestId: request.requestId, status: "completed", message: "fake 적용·HMR·검증 흐름이 완료됐다." });
  }

  private async assertTargetsClean(paths: readonly string[]): Promise<void> {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain=v1", "--", ...paths], { cwd: this.workspaceRoot, encoding: "utf8" });
    if (stdout.trim()) throw new Error(`기존 사용자 변경과 겹치는 소유 파일은 적용할 수 없다:\n${stdout.trim()}`);
  }

  private async emitDiffs(request: ResourceEditRequest): Promise<void> {
    for (const file of request.selection.sourceFiles) {
      const { stdout } = await execFileAsync("git", ["diff", "--", file], { cwd: this.workspaceRoot, encoding: "utf8", maxBuffer: 2_000_000 });
      if (stdout) this.broadcast({ type: "diff", requestId: request.requestId, file, patch: stdout });
    }
  }
}

function assetIdPattern(assetId: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,120}$/i.test(assetId);
}
