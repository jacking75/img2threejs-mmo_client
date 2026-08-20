import type { EditorHostEvent, ResourceEditRequest, ValidationTarget } from "./editorTypes";

interface HealthResponse {
  readonly ok: boolean;
  readonly sessionToken: string;
  readonly agent: "idle" | "connecting" | "ready" | "error";
  readonly sessionId?: string;
  readonly protocol: "ACP v1";
  readonly adapterVersion: string;
}

interface CaptureResponse {
  readonly capturePath: string;
}

export class EditorHostClient {
  private sessionToken = "";
  private eventSource: EventSource | null = null;

  public constructor(private readonly onEvent: (event: EditorHostEvent) => void) {}

  public async connect(): Promise<boolean> {
    try {
      const health = await this.request<HealthResponse>("/api/resource-editor/health", { method: "GET" }, false);
      this.sessionToken = health.sessionToken;
      this.eventSource?.close();
      this.eventSource = new EventSource(`/api/resource-editor/events?token=${encodeURIComponent(this.sessionToken)}`);
      this.eventSource.addEventListener("editor", (event) => {
        try {
          this.onEvent(JSON.parse((event as MessageEvent<string>).data) as EditorHostEvent);
        } catch {
          this.onEvent({ type: "error", message: "호스트 이벤트를 해석하지 못했다." });
        }
      });
      this.eventSource.addEventListener("error", () => this.onEvent({ type: "error", message: "로컬 호스트 이벤트 연결이 끊겼다. 자동 재연결을 기다린다." }));
      this.onEvent({ type: "connected", agent: health.agent, sessionId: health.sessionId });
      return true;
    } catch {
      this.onEvent({ type: "error", message: "편집 호스트가 비활성 상태다. npm run dev:editor로 시작한다." });
      return false;
    }
  }

  public async uploadCapture(assetId: string, dataUrl: string): Promise<string> {
    const result = await this.request<CaptureResponse>("/api/resource-editor/captures", {
      method: "POST",
      body: JSON.stringify({ assetId, dataUrl }),
    });
    return result.capturePath;
  }

  public async startRequest(request: ResourceEditRequest): Promise<void> {
    await this.request("/api/resource-editor/requests", { method: "POST", body: JSON.stringify(request) });
  }

  public async decideApproval(approvalId: string, optionId: string | null): Promise<void> {
    await this.request(`/api/resource-editor/approvals/${encodeURIComponent(approvalId)}`, {
      method: "POST",
      body: JSON.stringify({ optionId }),
    });
  }

  public async cancel(requestId: string): Promise<void> {
    await this.request(`/api/resource-editor/requests/${encodeURIComponent(requestId)}/cancel`, { method: "POST" });
  }

  public async validate(requestId: string, targets: readonly ValidationTarget[], focusedTests: readonly string[]): Promise<void> {
    await this.request(`/api/resource-editor/requests/${encodeURIComponent(requestId)}/validate`, {
      method: "POST",
      body: JSON.stringify({ targets, focusedTests }),
    });
  }

  public dispose(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }

  private async request<T = Record<string, unknown>>(path: string, init: RequestInit, authorized = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (authorized && this.sessionToken) headers.set("X-Resource-Editor-Token", this.sessionToken);
    const response = await fetch(path, { ...init, headers });
    const payload = await response.json() as T & { readonly error?: string };
    if (!response.ok) throw new Error(payload.error ?? `호스트 요청 실패: ${response.status}`);
    return payload;
  }
}
