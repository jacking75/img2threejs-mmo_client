import type { ApprovalRequestView, EditStatus, EditorHostEvent } from "./editorTypes";

export interface AgentPanelOptions {
  readonly onPlan: (instruction: string) => void;
  readonly onApply: () => void;
  readonly onCancel: () => void;
  readonly onApproval: (approvalId: string, optionId: string | null) => void;
}

export class AgentPanel {
  private readonly instruction: HTMLTextAreaElement;
  private readonly timeline: HTMLElement;
  private readonly status: HTMLElement;
  private readonly applyButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;

  public constructor(private readonly root: HTMLElement, private readonly options: AgentPanelOptions) {
    root.innerHTML = `
      <div class="re-agent-head"><div><span class="re-kicker">ACP · CODEX</span><strong>리소스 협업</strong></div><span class="re-agent-status" data-status="context-ready">CONTEXT READY</span></div>
      <div class="re-agent-context"><span>읽기 전용 계획 → 요청별 승인 → 적용</span><strong id="re-agent-target">선택 대기</strong></div>
      <textarea id="re-instruction" rows="4" placeholder="예: 이 늑대의 귀를 조금 더 길고 뒤로 젖혀 달라"></textarea>
      <div class="re-agent-actions">
        <button class="re-button re-button-primary" id="re-plan" type="button">계획 요청</button>
        <button class="re-button re-button-apply" id="re-apply" type="button" disabled>계획 승인·적용</button>
        <button class="re-button re-button-quiet" id="re-cancel" type="button" disabled>취소</button>
      </div>
      <div class="re-timeline" id="re-timeline" aria-live="polite"><p class="re-empty">아직 요청이 없다.</p></div>
    `;
    const instruction = root.querySelector<HTMLTextAreaElement>("#re-instruction");
    const timeline = root.querySelector<HTMLElement>("#re-timeline");
    const status = root.querySelector<HTMLElement>(".re-agent-status");
    const apply = root.querySelector<HTMLButtonElement>("#re-apply");
    const cancel = root.querySelector<HTMLButtonElement>("#re-cancel");
    if (!instruction || !timeline || !status || !apply || !cancel) throw new Error("에이전트 패널 초기화에 실패했다.");
    this.instruction = instruction;
    this.timeline = timeline;
    this.status = status;
    this.applyButton = apply;
    this.cancelButton = cancel;
    root.querySelector<HTMLButtonElement>("#re-plan")?.addEventListener("click", () => {
      if (this.instruction.value.trim()) this.options.onPlan(this.instruction.value.trim());
    });
    apply.addEventListener("click", () => this.options.onApply());
    cancel.addEventListener("click", () => this.options.onCancel());
  }

  public setTarget(assetLabel: string, partName: string | null): void {
    const target = this.root.querySelector<HTMLElement>("#re-agent-target");
    if (target) target.textContent = partName ? `${assetLabel} · ${partName}` : `${assetLabel} · 전체`;
  }

  public clearTimeline(): void {
    this.timeline.replaceChildren();
  }

  public handle(event: EditorHostEvent): void {
    if (event.type === "connected") {
      this.addEntry("system", `ACP 호스트 ${event.agent}${event.sessionId ? ` · 세션 ${event.sessionId.slice(0, 8)}` : ""}`);
      return;
    }
    if (event.type === "status") {
      this.setStatus(event.status);
      this.addEntry("status", event.message);
      return;
    }
    if (event.type === "message") {
      this.addEntry(event.role, event.text);
      return;
    }
    if (event.type === "plan") {
      const list = document.createElement("ol");
      list.className = "re-plan-list";
      event.entries.forEach((entry) => {
        const item = document.createElement("li");
        item.textContent = entry.content;
        item.dataset.status = entry.status;
        list.append(item);
      });
      this.addNode("plan", "변경 계획", list);
      return;
    }
    if (event.type === "tool") {
      this.addEntry("tool", `${event.title} · ${event.status}`);
      return;
    }
    if (event.type === "usage") {
      this.addEntry("usage", `컨텍스트 ${event.used.toLocaleString()} / ${event.size.toLocaleString()}`);
      return;
    }
    if (event.type === "approval") {
      this.renderApproval(event.approval);
      return;
    }
    if (event.type === "diff") {
      const pre = document.createElement("pre");
      pre.textContent = event.patch;
      this.addNode("diff", event.file, pre);
      return;
    }
    if (event.type === "validation") {
      this.addEntry("validation", `${event.result.label} · ${event.result.status}${event.result.durationMs ? ` · ${event.result.durationMs}ms` : ""}`);
      return;
    }
    this.addEntry("error", event.message);
  }

  public setStatus(status: EditStatus): void {
    this.status.dataset.status = status;
    this.status.textContent = status.replaceAll("-", " ").toUpperCase();
    this.applyButton.disabled = status !== "awaiting-approval";
    this.cancelButton.disabled = !["planning", "awaiting-approval", "applying", "verifying"].includes(status);
  }

  private renderApproval(approval: ApprovalRequestView): void {
    const actions = document.createElement("div");
    actions.className = "re-approval";
    const description = document.createElement("p");
    description.textContent = `${approval.reason} · ${approval.target}`;
    actions.append(description);
    approval.options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.label;
      button.addEventListener("click", () => {
        this.options.onApproval(approval.approvalId, option.optionId);
        actions.querySelectorAll("button").forEach((candidate) => candidate.setAttribute("disabled", ""));
      });
      actions.append(button);
    });
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "is-danger";
    reject.textContent = "거부";
    reject.addEventListener("click", () => this.options.onApproval(approval.approvalId, null));
    actions.append(reject);
    this.addNode("approval", "사용자 승인 필요", actions);
  }

  private addEntry(kind: string, text: string): void {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    this.addNode(kind, kind.toUpperCase(), paragraph);
  }

  private addNode(kind: string, label: string, content: Node): void {
    this.timeline.querySelector(".re-empty")?.remove();
    const entry = document.createElement("article");
    entry.className = "re-timeline-entry";
    entry.dataset.kind = kind;
    const header = document.createElement("header");
    header.innerHTML = `<span>${label}</span><time>${new Date().toLocaleTimeString("ko-KR", { hour12: false })}</time>`;
    entry.append(header, content);
    this.timeline.append(entry);
    this.timeline.scrollTop = this.timeline.scrollHeight;
  }
}
