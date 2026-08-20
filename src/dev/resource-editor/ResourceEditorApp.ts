import { assetCatalog } from "../../assets/catalog";
import type { AssetDefinition } from "../../assets/types";
import { AssetViewport } from "../shared/AssetViewport";
import { AgentPanel } from "./AgentPanel";
import { CatalogPanel } from "./CatalogPanel";
import { EditorHostClient } from "./EditorHostClient";
import { parsePersistedEditorState, toggleFavorite, withSelectedAsset, type PersistedEditorState } from "./editorState";
import { DEFAULT_OVERLAYS, DEFAULT_VALIDATION, type EditorHostEvent, type EditorSelection, type ResourceEditRequest } from "./editorTypes";
import { PropertyInspector } from "./PropertyInspector";
import { getResourceOwnership } from "./resourceManifest";
import { SceneOutliner } from "./SceneOutliner";

const STORAGE_KEY = "resource-editor.state.v1";

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`리소스 편집기 요소가 없다: ${selector}`);
  return element;
}

function definitionById(assetId: string | undefined): AssetDefinition {
  return assetCatalog.find((definition) => definition.id === assetId) ?? assetCatalog[0] as AssetDefinition;
}

export class ResourceEditorApp {
  private readonly viewport: AssetViewport;
  private readonly catalog: CatalogPanel;
  private readonly outliner: SceneOutliner;
  private readonly inspector: PropertyInspector;
  private readonly agent: AgentPanel;
  private readonly host: EditorHostClient;
  private state: PersistedEditorState;
  private currentDefinition: AssetDefinition;
  private lastRequest: ResourceEditRequest | null = null;
  private beforeDataUrl = "";

  public constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <main class="resource-editor" data-testid="resource-editor">
        <header class="re-topbar">
          <div class="re-brand"><span class="re-brand-mark">◇</span><div><span>RESOURCE ATELIER / EDIT</span><strong>절차형 리소스 편집 작업대</strong></div></div>
          <div class="re-top-status">
            <span><i class="re-live-dot"></i> LOCAL ONLY</span>
            <span>ACP v1 · 1.3.0</span>
            <span>655 ASSETS</span>
            <button id="re-theme" type="button" aria-label="테마 전환">◐</button>
          </div>
        </header>
        <section class="re-workbench">
          <aside class="re-panel re-catalog" aria-label="리소스 카탈로그"></aside>
          <section class="re-stage">
            <div class="re-stage-toolbar">
              <div><span class="re-kicker">VIEWPORT</span><strong id="re-asset-title">리소스</strong></div>
              <div class="re-view-actions" aria-label="뷰 프리셋">
                <button type="button" data-view="front">정면</button><button type="button" data-view="side">측면</button><button type="button" data-view="back">후면</button><button type="button" data-view="top">상단</button><button type="button" id="re-frame">프레임</button>
              </div>
            </div>
            <div class="re-viewport-wrap">
              <canvas class="re-viewport" aria-label="리소스 편집 3D 뷰포트"></canvas>
              <div class="re-viewport-label"><span id="re-asset-category">ASSET</span><strong id="re-asset-label">선택 대기</strong><small>클릭: 부품 선택 · 드래그: orbit · 휠: zoom</small></div>
              <div class="re-draft-badge" hidden>초안 변형 · 소스 미저장</div>
              <div class="re-compare" hidden>
                <img id="re-before-image" alt="변경 전 캡처"><div class="re-after-clip"><img id="re-after-image" alt="변경 후 캡처"></div>
                <input id="re-compare-range" type="range" min="0" max="100" value="50" aria-label="변경 전후 비교">
              </div>
            </div>
            <div class="re-stage-foot"><span>THREE.JS · PROCEDURAL SOURCE OF TRUTH</span><button id="re-compare-toggle" type="button" disabled>BEFORE / AFTER</button></div>
          </section>
          <aside class="re-side-stack">
            <section class="re-panel re-outliner-panel">
              <div class="re-panel-head"><div><span class="re-kicker">OUTLINER</span><strong>명명 부품</strong></div><input id="re-node-search" type="search" placeholder="부품 찾기" aria-label="부품 찾기"></div>
              <div class="re-outliner"></div>
            </section>
            <section class="re-panel re-inspector" aria-label="속성 검사기"></section>
          </aside>
          <aside class="re-panel re-agent" aria-label="ACP Codex 대화"></aside>
        </section>
      </main>
    `;

    const persisted = parsePersistedEditorState(localStorage.getItem(STORAGE_KEY));
    this.currentDefinition = definitionById(persisted.assetId);
    const viewportContainer = required<HTMLElement>(root, ".re-viewport-wrap");
    this.viewport = new AssetViewport({
      canvas: required<HTMLCanvasElement>(root, ".re-viewport"),
      container: viewportContainer,
      editable: true,
      autoMotion: false,
      onSelectionChange: (selection) => this.handlePartSelection(selection?.partKey ?? null),
      onAssetReady: () => this.handleAssetReady(),
    });
    this.state = {
      assetId: this.currentDefinition.id,
      partKey: persisted.partKey ?? null,
      camera: persisted.camera ?? this.viewport.getCameraSnapshot(),
      overlays: persisted.overlays ?? DEFAULT_OVERLAYS,
      sessionId: persisted.sessionId,
      favoriteIds: persisted.favoriteIds ?? [],
      recentAssetIds: persisted.recentAssetIds ?? [],
    };
    this.catalog = new CatalogPanel({
      root: required(root, ".re-catalog"),
      selectedId: this.currentDefinition.id,
      favoriteIds: this.state.favoriteIds,
      recentIds: this.state.recentAssetIds,
      onSelect: (definition) => this.selectAsset(definition),
      onToggleFavorite: (assetId) => this.handleFavorite(assetId),
    });
    this.outliner = new SceneOutliner(required(root, ".re-outliner"), (partKey) => this.viewport.selectPart(partKey));
    this.inspector = new PropertyInspector(required(root, ".re-inspector"), {
      onOverlayChange: (overlays) => {
        this.viewport.setOverlays(overlays);
        this.state = { ...this.state, overlays };
        this.persist();
      },
      onDraftChange: (enabled, mode) => {
        this.viewport.setDraftTransform(enabled, mode);
        required<HTMLElement>(root, ".re-draft-badge").hidden = !enabled;
      },
    });
    this.agent = new AgentPanel(required(root, ".re-agent"), {
      onPlan: (instruction) => void this.requestPlan(instruction),
      onApply: () => void this.requestApply(),
      onCancel: () => void this.cancelRequest(),
      onApproval: (approvalId, optionId) => void this.host.decideApproval(approvalId, optionId),
    });
    this.host = new EditorHostClient((event) => this.handleHostEvent(event));
    this.bindChrome();
  }

  public start(): void {
    this.selectAsset(this.currentDefinition, true);
    void this.host.connect();
    import.meta.hot?.on("vite:beforeUpdate", () => this.persist());
  }

  public dispose(): void {
    this.persist();
    this.host.dispose();
    this.viewport.dispose();
  }

  private bindChrome(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
      button.addEventListener("click", () => this.viewport.setViewPreset(button.dataset.view as "front" | "side" | "back" | "top"));
    });
    required<HTMLButtonElement>(this.root, "#re-frame").addEventListener("click", () => this.viewport.frameAsset());
    required<HTMLInputElement>(this.root, "#re-node-search").addEventListener("input", (event) => this.outliner.filter((event.target as HTMLInputElement).value));
    const compare = required<HTMLElement>(this.root, ".re-compare");
    const compareButton = required<HTMLButtonElement>(this.root, "#re-compare-toggle");
    compareButton.addEventListener("click", () => { compare.hidden = !compare.hidden; });
    required<HTMLInputElement>(this.root, "#re-compare-range").addEventListener("input", (event) => {
      const value = (event.target as HTMLInputElement).value;
      required<HTMLElement>(this.root, ".re-after-clip").style.clipPath = `inset(0 ${100 - Number(value)}% 0 0)`;
    });
    const theme = localStorage.getItem("resource-editor.theme");
    if (theme === "light") document.documentElement.dataset.resourceEditorTheme = "light";
    required<HTMLButtonElement>(this.root, "#re-theme").addEventListener("click", () => {
      const light = document.documentElement.dataset.resourceEditorTheme !== "light";
      document.documentElement.dataset.resourceEditorTheme = light ? "light" : "dark";
      localStorage.setItem("resource-editor.theme", light ? "light" : "dark");
    });
  }

  private selectAsset(definition: AssetDefinition, restoring = false): void {
    this.currentDefinition = definition;
    const restorePart = restoring ? this.state.partKey : null;
    this.viewport.showAsset(definition, restorePart);
    this.viewport.setOverlays(this.state.overlays);
    if (restoring) this.viewport.restoreCamera(this.state.camera);
    this.catalog?.setSelected(definition.id);
    required<HTMLElement>(this.root, "#re-asset-title").textContent = definition.id;
    required<HTMLElement>(this.root, "#re-asset-category").textContent = definition.category.toUpperCase();
    required<HTMLElement>(this.root, "#re-asset-label").textContent = definition.label;
    this.agent?.setTarget(definition.label, null);
    const selection = this.buildSelection();
    this.state = withSelectedAsset(this.state, selection);
    this.catalog?.setHistory(this.state.favoriteIds, this.state.recentAssetIds);
    this.refreshPanels();
    this.persist();
  }

  private handleAssetReady(): void {
    this.outliner?.render(this.viewport.getNodes(), this.viewport.getSelectedPart()?.partKey ?? null);
    this.refreshPanels();
  }

  private handlePartSelection(partKey: string | null): void {
    this.state = { ...this.state, partKey, camera: this.viewport.getCameraSnapshot() };
    this.outliner?.setSelected(partKey);
    this.refreshPanels();
    this.persist();
  }

  private refreshPanels(): void {
    const ownership = getResourceOwnership(this.currentDefinition);
    const part = this.viewport.getSelectedPart();
    this.inspector?.render(this.currentDefinition, ownership, part, this.viewport.getOverlays());
    this.agent?.setTarget(this.currentDefinition.label, part?.nodeName ?? null);
  }

  private handleFavorite(assetId: string): void {
    this.state = toggleFavorite(this.state, assetId);
    this.catalog.setHistory(this.state.favoriteIds, this.state.recentAssetIds);
    this.persist();
  }

  private buildSelection(capturePath?: string): EditorSelection {
    const ownership = getResourceOwnership(this.currentDefinition);
    return {
      assetId: this.currentDefinition.id,
      category: this.currentDefinition.category,
      sourceFiles: ownership.sourceFiles,
      focusedTests: ownership.focusedTests,
      part: this.viewport.getSelectedPart(),
      camera: this.viewport.getCameraSnapshot(),
      overlays: this.viewport.getOverlays(),
      ...(capturePath ? { capturePath } : {}),
    };
  }

  private async requestPlan(instruction: string): Promise<void> {
    try {
      this.agent.clearTimeline();
      this.agent.setStatus("planning");
      this.beforeDataUrl = this.viewport.captureDataUrl();
      const capturePath = await this.host.uploadCapture(this.currentDefinition.id, this.beforeDataUrl);
      const request: ResourceEditRequest = {
        requestId: crypto.randomUUID(),
        sessionId: this.state.sessionId,
        instruction,
        selection: this.buildSelection(capturePath),
        mode: "plan",
        allowedWriteRoots: ["src/assets", "tests/assets"],
        validation: DEFAULT_VALIDATION,
      };
      this.lastRequest = request;
      await this.host.startRequest(request);
    } catch (error) {
      this.handleHostEvent({ type: "error", message: error instanceof Error ? error.message : "계획 요청에 실패했다." });
      this.agent.setStatus("failed");
    }
  }

  private async requestApply(): Promise<void> {
    if (!this.lastRequest) return;
    const request: ResourceEditRequest = { ...this.lastRequest, requestId: crypto.randomUUID(), mode: "apply" };
    this.lastRequest = request;
    try {
      await this.host.startRequest(request);
    } catch (error) {
      this.handleHostEvent({ type: "error", message: error instanceof Error ? error.message : "적용 요청에 실패했다." });
    }
  }

  private async cancelRequest(): Promise<void> {
    if (!this.lastRequest) return;
    await this.host.cancel(this.lastRequest.requestId);
  }

  private handleHostEvent(event: EditorHostEvent): void {
    this.agent?.handle(event);
    if (event.type === "connected" && event.sessionId) {
      this.state = { ...this.state, sessionId: event.sessionId };
      this.persist();
    }
    if (event.type === "status" && event.status === "reloading") {
      this.viewport.showAsset(this.currentDefinition, this.state.partKey);
      this.viewport.restoreCamera(this.state.camera);
      this.viewport.setOverlays(this.state.overlays);
    }
    if (event.type === "status" && event.status === "completed" && this.beforeDataUrl) {
      const after = this.viewport.captureDataUrl();
      required<HTMLImageElement>(this.root, "#re-before-image").src = this.beforeDataUrl;
      required<HTMLImageElement>(this.root, "#re-after-image").src = after;
      required<HTMLButtonElement>(this.root, "#re-compare-toggle").disabled = false;
    }
  }

  private persist(): void {
    this.state = { ...this.state, camera: this.viewport.getCameraSnapshot(), overlays: this.viewport.getOverlays() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}
