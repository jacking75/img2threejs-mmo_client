import { resolve } from "node:path";
import { Readable, Writable } from "node:stream";
import {
  ClientSideConnection,
  PROTOCOL_VERSION,
  ndJsonStream,
  type Client,
  type ContentBlock,
  type RequestPermissionRequest,
  type SessionId,
} from "@agentclientprotocol/sdk";
import type { EditorHostEvent, ResourceEditRequest } from "../../../src/dev/resource-editor/editorTypes";
import type { ApprovalBroker } from "../policy/ApprovalBroker";
import type { WorkspacePolicy } from "../policy/WorkspacePolicy";
import { CodexAgentProcess } from "./CodexAgentProcess";
import { mapAcpUpdate } from "./eventMapper";

export interface AcpRunResult {
  readonly sessionId: string;
  readonly stopReason: string;
}

function promptPacket(request: ResourceEditRequest): string {
  const modeRule = request.mode === "plan"
    ? "읽기 전용 계획 단계다. 어떤 파일도 수정하지 말고 명령도 실행하지 않는다. 대상과 소유 소스를 확인한 뒤 구체적인 변경 계획과 검증 명령만 제시한다."
    : "사용자가 계획 적용을 명시적으로 선택했다. 아래 sourceFiles와 허용 쓰기 범위 안에서만 수정하고, 패키지 설치·commit·push·reset은 하지 않는다. 모든 권한 요청은 UI의 건별 승인을 기다린다.";
  return [
    "Anime Field RPG 로컬 Resource Editor 요청이다.",
    modeRule,
    `사용자 지시: ${request.instruction}`,
    "구조화된 편집 컨텍스트:",
    JSON.stringify(request.selection, null, 2),
    `허용 쓰기 root: ${request.allowedWriteRoots.join(", ")}`,
    `검증 대상: ${request.validation.map((target) => target.id).join(", ")}`,
  ].join("\n\n");
}

function approvalTarget(params: RequestPermissionRequest): string {
  const locations = params.toolCall.locations?.map((location) => location.path) ?? [];
  return locations.length ? locations.join(", ") : params.toolCall.title ?? params.toolCall.toolCallId;
}

export class AcpClient {
  private process: CodexAgentProcess | null = null;
  private connection: ClientSideConnection | null = null;
  private activeSessionId: SessionId | null = null;

  public constructor(
    private readonly workspaceRoot: string,
    private readonly policy: WorkspacePolicy,
    private readonly approvalBroker: ApprovalBroker,
    private readonly emit: (event: EditorHostEvent) => void,
  ) {}

  public async run(request: ResourceEditRequest, signal: AbortSignal): Promise<AcpRunResult> {
    this.process = new CodexAgentProcess(this.workspaceRoot, (message) => this.emit({ type: "tool", requestId: request.requestId, title: message, status: "stderr" }));
    const child = this.process.start(request.mode === "plan" ? "read-only" : "agent");
    const output = Writable.toWeb(child.stdin) as WritableStream<Uint8Array>;
    const input = Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>;
    const stream = ndJsonStream(output, input);
    const client: Client = {
      requestPermission: (params) => this.handlePermission(request, params),
      sessionUpdate: (params) => {
        const event = mapAcpUpdate(request.requestId, params.update);
        if (event) this.emit(event);
      },
    };
    this.connection = new ClientSideConnection(() => client, stream);
    const onAbort = (): void => { void this.cancel(); };
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      const initialized = await this.connection.initialize({
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: { terminal: false, plan: {} },
        clientInfo: { name: "anime-field-resource-editor", version: "0.1.0" },
      });
      if (initialized.protocolVersion !== PROTOCOL_VERSION) throw new Error(`지원하지 않는 ACP 프로토콜 버전이다: ${initialized.protocolVersion}`);
      let sessionId: SessionId;
      if (request.sessionId && initialized.agentCapabilities?.loadSession) {
        await this.connection.loadSession({ sessionId: request.sessionId, cwd: this.workspaceRoot, mcpServers: [] });
        sessionId = request.sessionId;
      } else {
        const created = await this.connection.newSession({ cwd: this.workspaceRoot, mcpServers: [] });
        sessionId = created.sessionId;
      }
      this.activeSessionId = sessionId;
      const desiredMode = request.mode === "plan" ? "read-only" : "agent";
      try {
        await this.connection.setSessionMode({ sessionId, modeId: desiredMode });
      } catch {
        this.emit({ type: "tool", requestId: request.requestId, title: `${desiredMode} 모드는 어댑터 초기 모드로 유지된다.`, status: "info" });
      }
      const captureLink: ContentBlock | null = request.selection.capturePath ? {
        type: "resource_link",
        name: "resource-editor-capture",
        uri: `file:///${resolve(this.workspaceRoot, request.selection.capturePath).replaceAll("\\", "/")}`,
        description: `${request.selection.assetId} 편집 전 캡처`,
      } : null;
      const response = await this.connection.prompt({
        sessionId,
        prompt: [{ type: "text", text: promptPacket(request) }, ...(captureLink ? [captureLink] : [])],
      });
      return { sessionId, stopReason: response.stopReason };
    } finally {
      signal.removeEventListener("abort", onAbort);
      await this.close();
    }
  }

  public async cancel(): Promise<void> {
    if (this.connection && this.activeSessionId) {
      try { await this.connection.cancel({ sessionId: this.activeSessionId }); } catch { /* 프로세스 종료로 보완한다. */ }
    }
    this.approvalBroker.cancelAll();
    await this.close();
  }

  private async handlePermission(request: ResourceEditRequest, params: RequestPermissionRequest) {
    if (request.mode === "plan") return { outcome: { outcome: "cancelled" as const } };
    const locations = params.toolCall.locations?.map((location) => location.path) ?? [];
    try {
      if (params.toolCall.kind === "delete" || params.toolCall.kind === "move" || params.toolCall.kind === "fetch") {
        throw new Error(`MVP에서 허용하지 않는 도구 종류다: ${params.toolCall.kind}`);
      }
      if (params.toolCall.kind === "execute") {
        const rawInput = params.toolCall.rawInput as { readonly command?: unknown } | undefined;
        if (typeof rawInput?.command !== "string" || !this.policy.isAllowedValidationCommand(rawInput.command)) {
          throw new Error("registry에 없는 명령 실행 요청을 거부했다.");
        }
      }
      if (params.toolCall.kind === "edit" && locations.length === 0) throw new Error("대상 파일 위치가 없는 편집 요청을 거부했다.");
      for (const location of locations) {
        const relativePath = location.replace(this.workspaceRoot, "").replace(/^[/\\]+/, "");
        this.policy.resolveWritablePath(relativePath);
        if (!request.selection.sourceFiles.includes(relativePath.replaceAll("\\", "/"))) {
          throw new Error(`선택 리소스 소유 파일이 아니다: ${relativePath}`);
        }
      }
    } catch (error) {
      this.emit({ type: "error", requestId: request.requestId, message: error instanceof Error ? error.message : "권한 범위 검증에 실패했다." });
      return { outcome: { outcome: "cancelled" as const } };
    }
    const approvalId = crypto.randomUUID();
    const wait = this.approvalBroker.request({
      approvalId,
      requestId: request.requestId,
      reason: params.toolCall.title ?? "도구 실행 권한",
      target: approvalTarget(params),
      options: params.options.filter((option) => option.kind !== "allow_always").map((option) => ({ optionId: option.optionId, label: option.name, kind: option.kind })),
    });
    const approval = this.approvalBroker.get(approvalId);
    if (approval) this.emit({ type: "approval", requestId: request.requestId, approval });
    const optionId = await wait;
    return optionId ? { outcome: { outcome: "selected" as const, optionId } } : { outcome: { outcome: "cancelled" as const } };
  }

  private async close(): Promise<void> {
    this.connection = null;
    this.activeSessionId = null;
    await this.process?.stop();
    this.process = null;
  }
}
