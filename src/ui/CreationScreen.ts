import { CLASS_CATALOG, ITEM_CATALOG } from "../domain/catalog";
import {
  BODY_PRESENTATIONS,
  CHARACTER_CLASSES,
  createDefaultProfile,
  validateCharacterName,
} from "../domain/character";
import type { BodyPresentation, CharacterClass, CharacterProfile } from "../domain/character";
import { CharacterPreview } from "../render/CharacterPreview";

const BODY_LABELS: Readonly<Record<BodyPresentation, { label: string; description: string }>> = {
  feminine: { label: "여성형", description: "부드러운 선과 가벼운 실루엣" },
  masculine: { label: "남성형", description: "넓은 어깨와 단단한 실루엣" },
};

export interface CreationScreenOptions {
  readonly root: HTMLElement;
  readonly onComplete: (profile: CharacterProfile) => boolean;
  readonly onCancel: () => void;
}

export class CreationScreen {
  private readonly root: HTMLElement;
  private readonly onComplete: (profile: CharacterProfile) => boolean;
  private readonly onCancel: () => void;
  private selectedBody: BodyPresentation = "feminine";
  private selectedClass: CharacterClass = "warrior";
  private preview: CharacterPreview | null = null;

  public constructor(options: CreationScreenOptions) {
    this.root = options.root;
    this.onComplete = options.onComplete;
    this.onCancel = options.onCancel;
  }

  public start(): void {
    this.root.innerHTML = `
      <main class="character-creation-shell">
        <div class="creation-atmosphere" aria-hidden="true"><span></span><span></span><span></span></div>
        <header class="creation-topbar">
          <button class="back-command" type="button" data-action="cancel"><span>‹</span> 캐릭터 선택</button>
          <div><p>ST★RLIGHT FRONTIER</p><h1>새 모험가 생성</h1></div>
          <span class="creation-step">CHARACTER CREATION · 01</span>
        </header>

        <form class="character-creation-layout" novalidate>
          <section class="creation-control-panel class-select-panel" aria-labelledby="class-title">
            <div class="game-panel-title"><span>01</span><div><small>CLASS</small><h2 id="class-title">클래스 선택</h2></div></div>
            <div class="class-options" role="radiogroup" aria-label="클래스"></div>
            <article class="class-detail">
              <small>CLASS DESCRIPTION</small>
              <h3 id="class-detail-title"></h3>
              <p id="class-detail-description"></p>
            </article>
          </section>

          <section class="creation-character-stage" aria-label="생성 캐릭터 미리보기">
            <canvas class="character-preview-canvas"></canvas>
            <div class="preview-caption"><span>REAL-TIME PREVIEW</span><strong class="preview-class-name"></strong><small>선택 사항이 즉시 반영된다</small></div>
            <label class="creation-name-field">
              <span>캐릭터 이름</span>
              <input name="characterName" type="text" minlength="2" maxlength="16" autocomplete="off" placeholder="이름을 입력한다" aria-describedby="name-message" />
              <small id="name-message">2~16자로 입력한다.</small>
            </label>
          </section>

          <aside class="creation-control-panel appearance-panel" aria-labelledby="appearance-title">
            <div class="game-panel-title"><span>02</span><div><small>APPEARANCE</small><h2 id="appearance-title">체형 표현</h2></div></div>
            <div class="body-options"></div>
            <div class="loadout-summary">
              <div class="game-panel-title game-panel-title--small"><span>03</span><div><small>LOADOUT</small><h2>시작 장비</h2></div></div>
              <div class="loadout-list"></div>
            </div>
          </aside>

          <footer class="creation-command-bar">
            <p class="form-message" role="status" aria-live="polite"></p>
            <div><button class="game-button" type="button" data-action="cancel">취소</button><button class="game-button game-button--primary" type="submit" disabled>생성 완료</button></div>
          </footer>
        </form>
      </main>
    `;

    const form = this.requiredElement<HTMLFormElement>("form");
    const nameInput = this.requiredElement<HTMLInputElement>("input[name='characterName']");
    const completeButton = this.requiredElement<HTMLButtonElement>("button[type='submit']");
    const nameMessage = this.requiredElement<HTMLElement>("#name-message");

    this.renderClassOptions();
    this.renderBodyOptions();
    this.updateSelectionSummary();
    this.preview = new CharacterPreview(
      this.requiredElement<HTMLCanvasElement>(".character-preview-canvas"),
      this.createPreviewProfile(),
      { showClassEquipment: true },
    );

    const updateNameState = (): void => {
      const validation = validateCharacterName(nameInput.value);
      completeButton.disabled = !validation.valid;
      nameInput.setAttribute("aria-invalid", String(!validation.valid && nameInput.value.length > 0));
      if (validation.valid) {
        nameMessage.textContent = `사용 가능한 이름 · ${validation.name}`;
        nameMessage.classList.add("is-valid");
      } else {
        nameMessage.textContent = validation.reason === "too-long" ? "이름은 16자를 넘을 수 없다." : "이름은 2자 이상이어야 한다.";
        nameMessage.classList.remove("is-valid");
      }
    };

    nameInput.addEventListener("input", updateNameState);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const validation = validateCharacterName(nameInput.value);
      if (!validation.valid) {
        updateNameState();
        nameInput.focus();
        return;
      }
      const profile = createDefaultProfile({ name: validation.name, body: this.selectedBody, classId: this.selectedClass });
      if (!this.onComplete(profile)) this.showMessage("프로필을 로컬에 저장하지 못했다.");
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-action='cancel']").forEach((button) => button.addEventListener("click", this.onCancel));
  }

  public dispose(): void {
    this.preview?.dispose();
    this.preview = null;
  }

  private renderBodyOptions(): void {
    const container = this.requiredElement<HTMLElement>(".body-options");
    for (const body of BODY_PRESENTATIONS) {
      const definition = BODY_LABELS[body];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "body-choice";
      button.dataset.body = body;
      button.innerHTML = `<span>${body === "feminine" ? "◇" : "◆"}</span><div><strong>${definition.label}</strong><small>${definition.description}</small></div>`;
      button.addEventListener("click", () => {
        this.selectedBody = body;
        this.updatePressedState("[data-body]", "body", body);
        this.refreshPreview();
      });
      container.append(button);
    }
    this.updatePressedState("[data-body]", "body", this.selectedBody);
  }

  private renderClassOptions(): void {
    const classMarks: Record<CharacterClass, string> = { warrior: "⚔", mage: "✦", ranger: "➹" };
    const container = this.requiredElement<HTMLElement>(".class-options");
    for (const classId of CHARACTER_CLASSES) {
      const definition = CLASS_CATALOG[classId];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "class-card";
      button.dataset.classId = classId;
      button.setAttribute("role", "radio");
      button.innerHTML = `<span>${classMarks[classId]}</span><div><strong>${definition.label}</strong><small>${classId.toUpperCase()}</small></div><b>›</b>`;
      button.addEventListener("click", () => {
        this.selectedClass = classId;
        this.updatePressedState("[data-class-id]", "classId", classId);
        this.updateSelectionSummary();
        this.refreshPreview();
      });
      container.append(button);
    }
    this.updatePressedState("[data-class-id]", "classId", this.selectedClass);
  }

  private updateSelectionSummary(): void {
    const definition = CLASS_CATALOG[this.selectedClass];
    this.requiredElement<HTMLElement>("#class-detail-title").textContent = definition.label;
    this.requiredElement<HTMLElement>("#class-detail-description").textContent = definition.description;
    this.requiredElement<HTMLElement>(".preview-class-name").textContent = definition.label;
    const slotLabels = { weapon: "무기", outfit: "의상", head: "머리" } as const;
    const list = this.requiredElement<HTMLElement>(".loadout-list");
    list.replaceChildren();
    for (const slot of ["weapon", "outfit", "head"] as const) {
      const itemId = definition.starterEquipment[slot];
      const row = document.createElement("div");
      row.className = "loadout-row";
      row.innerHTML = `<span>${slotLabels[slot]}</span><strong>${ITEM_CATALOG[itemId].label}</strong>`;
      list.append(row);
    }
  }

  private createPreviewProfile(): CharacterProfile {
    return createDefaultProfile({ name: "새 모험가", body: this.selectedBody, classId: this.selectedClass });
  }

  private refreshPreview(): void {
    this.preview?.updateProfile(this.createPreviewProfile());
  }

  private updatePressedState(selector: string, dataKey: "body" | "classId", selectedValue: string): void {
    this.root.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
      const selected = button.dataset[dataKey] === selectedValue;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      if (button.getAttribute("role") === "radio") button.setAttribute("aria-checked", String(selected));
    });
  }

  private showMessage(message: string): void {
    this.requiredElement<HTMLElement>(".form-message").textContent = message;
  }

  private requiredElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Creation screen element is missing: ${selector}`);
    return element;
  }
}
