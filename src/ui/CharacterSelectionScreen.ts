import { CLASS_CATALOG, ITEM_CATALOG } from "../domain/catalog";
import type { CharacterProfile } from "../domain/character";
import { CharacterPreview } from "../render/CharacterPreview";

export interface CharacterSelectionScreenOptions {
  readonly root: HTMLElement;
  readonly profile: CharacterProfile | null;
  readonly onCreate: () => void;
  readonly onDelete: () => boolean;
  readonly onEnterField: (profile: CharacterProfile) => void;
}

export class CharacterSelectionScreen {
  private readonly root: HTMLElement;
  private readonly profile: CharacterProfile | null;
  private readonly onCreate: () => void;
  private readonly onDelete: () => boolean;
  private readonly onEnterField: (profile: CharacterProfile) => void;
  private preview: CharacterPreview | null = null;
  private deleteArmed = false;

  public constructor(options: CharacterSelectionScreenOptions) {
    this.root = options.root;
    this.profile = options.profile;
    this.onCreate = options.onCreate;
    this.onDelete = options.onDelete;
    this.onEnterField = options.onEnterField;
  }

  public start(): void {
    const profile = this.profile;
    const classDefinition = profile ? CLASS_CATALOG[profile.classId] : null;
    this.root.innerHTML = `
      <main class="character-select-shell ${profile ? "has-character" : "is-empty"}">
        <div class="lobby-atmosphere" aria-hidden="true"><span></span><span></span><span></span></div>
        <header class="game-brand">
          <p>ST★RLIGHT FRONTIER</p>
          <h1>캐릭터 선택</h1>
          <span>LOCAL ADVENTURE CLIENT</span>
        </header>
        <section class="character-stage" aria-label="선택된 캐릭터 미리보기">
          ${profile ? '<canvas class="character-preview-canvas"></canvas>' : `
            <div class="empty-character-stage">
              <span aria-hidden="true">＋</span>
              <strong>아직 생성된 캐릭터가 없다</strong>
              <p>새 모험가를 생성하고 별빛 초원으로 떠난다.</p>
            </div>
          `}
          <div class="stage-nameplate">
            <span>${profile ? "SELECTED CHARACTER" : "EMPTY SLOT"}</span>
            <strong class="selected-character-name"></strong>
            <small class="selected-character-class"></small>
          </div>
        </section>
        <aside class="lobby-command-panel">
          <div class="panel-heading"><span>01</span><div><small>CHARACTER</small><strong>모험가 정보</strong></div></div>
          ${profile ? `
            <dl class="character-specs">
              <div><dt>이름</dt><dd class="spec-name"></dd></div>
              <div><dt>클래스</dt><dd class="spec-class"></dd></div>
              <div><dt>체형</dt><dd>${profile.body === "feminine" ? "여성형" : "남성형"}</dd></div>
              <div><dt>주 무기</dt><dd class="spec-weapon"></dd></div>
            </dl>
            <p class="class-flavor">${classDefinition?.description ?? ""}</p>
          ` : '<p class="empty-panel-copy">캐릭터 생성 버튼을 눌러 체형과 클래스를 선택한다.</p>'}
          <p class="lobby-message" role="status" aria-live="polite"></p>
          <div class="lobby-actions">
            <button class="game-button game-button--primary" type="button" data-action="enter" ${profile ? "" : "disabled"}>필드 입장</button>
            <button class="game-button" type="button" data-action="create">캐릭터 생성</button>
            <button class="game-button game-button--danger" type="button" data-action="delete" ${profile ? "" : "disabled"}>캐릭터 삭제</button>
          </div>
        </aside>
        <nav class="character-slots" aria-label="캐릭터 슬롯">
          <button class="character-slot ${profile ? "is-selected" : "is-empty"}" type="button" ${profile ? "" : "disabled"}>
            <span>${profile ? classDefinition?.label.slice(0, 1) : "+"}</span>
            <div><strong class="slot-name">${profile?.name ?? "빈 슬롯"}</strong><small>${classDefinition?.label ?? "캐릭터 생성 가능"}</small></div>
          </button>
          <button class="character-slot character-slot--create" type="button" data-action="create"><span>＋</span><div><strong>새 캐릭터</strong><small>CREATE</small></div></button>
        </nav>
        <footer class="lobby-footer"><span>단일 로컬 캐릭터 슬롯</span><span>서버 연결 없이 저장된다</span></footer>
      </main>
    `;

    if (profile && classDefinition) {
      this.root.querySelectorAll<HTMLElement>(".selected-character-name, .spec-name").forEach((element) => { element.textContent = profile.name; });
      this.root.querySelectorAll<HTMLElement>(".selected-character-class, .spec-class").forEach((element) => { element.textContent = classDefinition.label; });
      const weapon = profile.equipped.weapon ? ITEM_CATALOG[profile.equipped.weapon as keyof typeof ITEM_CATALOG] : null;
      this.requiredElement<HTMLElement>(".spec-weapon").textContent = weapon?.label ?? "없음";
      this.preview = new CharacterPreview(this.requiredElement<HTMLCanvasElement>(".character-preview-canvas"), profile);
    }

    this.root.querySelectorAll<HTMLButtonElement>("[data-action='create']").forEach((button) => button.addEventListener("click", this.onCreate));
    this.requiredElement<HTMLButtonElement>("[data-action='enter']").addEventListener("click", () => {
      if (profile) this.onEnterField(profile);
    });
    this.requiredElement<HTMLButtonElement>("[data-action='delete']").addEventListener("click", this.handleDelete);
  }

  public dispose(): void {
    this.preview?.dispose();
    this.preview = null;
  }

  private readonly handleDelete = (): void => {
    if (!this.profile) return;
    const button = this.requiredElement<HTMLButtonElement>("[data-action='delete']");
    if (!this.deleteArmed) {
      this.deleteArmed = true;
      button.textContent = "정말 삭제한다";
      this.showMessage("삭제하면 이 캐릭터의 로컬 장비 기록도 함께 사라진다.");
      return;
    }
    if (!this.onDelete()) {
      this.showMessage("로컬 캐릭터를 삭제하지 못했다.");
    }
  };

  private showMessage(message: string): void {
    this.requiredElement<HTMLElement>(".lobby-message").textContent = message;
  }

  private requiredElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Character selection element is missing: ${selector}`);
    return element;
  }
}
