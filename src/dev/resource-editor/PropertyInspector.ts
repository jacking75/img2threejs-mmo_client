import type { AssetDefinition } from "../../assets/types";
import type { EditorPartSelection, OverlayState } from "./editorTypes";
import type { ResourceOwnership } from "./resourceManifest";

export interface InspectorOptions {
  readonly onOverlayChange: (overlays: OverlayState) => void;
  readonly onDraftChange: (enabled: boolean, mode: "translate" | "rotate" | "scale") => void;
}

function numbers(values: readonly number[]): string {
  return values.map((value) => Number.isFinite(value) ? value.toFixed(3) : "—").join(" · ");
}

export class PropertyInspector {
  private overlays: OverlayState | null = null;

  public constructor(private readonly root: HTMLElement, private readonly options: InspectorOptions) {}

  public render(definition: AssetDefinition, ownership: ResourceOwnership, selection: EditorPartSelection | null, overlays: OverlayState): void {
    this.overlays = overlays;
    const transform = selection?.localTransform;
    const bounds = selection?.worldBounds;
    this.root.innerHTML = `
      <div class="re-inspector-block">
        <span class="re-kicker">ASSET OWNERSHIP</span>
        <dl class="re-properties">
          <dt>ID</dt><dd>${definition.id}</dd>
          <dt>분류</dt><dd>${definition.category}</dd>
          <dt>부품</dt><dd>${selection?.nodeName ?? "부품을 선택한다"}</dd>
          <dt>partKey</dt><dd data-testid="part-key">${selection?.partKey ?? "—"}</dd>
        </dl>
        <div class="re-source-list">${ownership.sourceFiles.map((file) => `<code>${file}</code>`).join("")}</div>
        <p class="re-impact">${ownership.sharedImpact}</p>
      </div>
      <div class="re-inspector-block">
        <span class="re-kicker">TRANSFORM · READ ONLY</span>
        <dl class="re-properties re-properties-wide">
          <dt>Position</dt><dd>${transform ? numbers(transform.position) : "—"}</dd>
          <dt>Rotation</dt><dd>${transform ? numbers(transform.quaternion) : "—"}</dd>
          <dt>Scale</dt><dd>${transform ? numbers(transform.scale) : "—"}</dd>
          <dt>Bounds min</dt><dd>${bounds ? numbers(bounds.min) : "—"}</dd>
          <dt>Bounds max</dt><dd>${bounds ? numbers(bounds.max) : "—"}</dd>
        </dl>
        <div class="re-draft-controls">
          <label><input id="re-draft-toggle" type="checkbox" ${selection ? "" : "disabled"}> 초안 transform</label>
          <select id="re-transform-mode" aria-label="초안 transform 모드"><option value="translate">이동</option><option value="rotate">회전</option><option value="scale">크기</option></select>
        </div>
        <p class="re-warning">초안은 소스에 저장되지 않는다. 영속 변경은 승인 후 팩토리 코드에 적용한다.</p>
      </div>
      <div class="re-inspector-block">
        <span class="re-kicker">OVERLAYS</span>
        <div class="re-overlay-grid">
          ${(["wireframe", "bounds", "sockets", "colliders", "axes"] as const).map((key) => `<label><input type="checkbox" data-overlay="${key}" ${overlays[key] ? "checked" : ""}> ${key}</label>`).join("")}
        </div>
      </div>
    `;
    this.bind();
  }

  private bind(): void {
    const draft = this.root.querySelector<HTMLInputElement>("#re-draft-toggle");
    const mode = this.root.querySelector<HTMLSelectElement>("#re-transform-mode");
    const notifyDraft = (): void => this.options.onDraftChange(Boolean(draft?.checked), (mode?.value ?? "translate") as "translate" | "rotate" | "scale");
    draft?.addEventListener("change", notifyDraft);
    mode?.addEventListener("change", notifyDraft);
    this.root.querySelectorAll<HTMLInputElement>("[data-overlay]").forEach((input) => {
      input.addEventListener("change", () => {
        if (!this.overlays) return;
        const key = input.dataset.overlay as keyof OverlayState;
        this.overlays = { ...this.overlays, [key]: input.checked };
        this.options.onOverlayChange(this.overlays);
      });
    });
  }
}
