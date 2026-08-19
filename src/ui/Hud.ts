import type { CharacterProfile } from "../domain/character";
import { CLASS_CATALOG, getItemDefinition } from "../domain/catalog";
import type { AnimationState } from "../game/animationState";

export interface HudView {
  readonly characterName: string;
  readonly classLabel: string;
  readonly classMark: string;
  readonly weaponLabel: string;
}

export function buildHudView(profile: CharacterProfile): HudView {
  const classLabel = CLASS_CATALOG[profile.classId].label;
  const weapon = profile.equipped.weapon
    ? getItemDefinition(profile.equipped.weapon)
    : undefined;
  return {
    characterName: profile.name,
    classLabel,
    classMark: classLabel.slice(0, 1),
    weaponLabel: `장착 검 · ${weapon?.label ?? "없음"}`,
  };
}

export interface HudOptions {
  readonly root: HTMLElement;
  readonly profile: CharacterProfile;
  readonly onExit: () => void;
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly onExit: () => void;
  private profile: CharacterProfile;
  private nameElement: HTMLElement | null = null;
  private classElement: HTMLElement | null = null;
  private portraitElement: HTMLElement | null = null;
  private weaponElement: HTMLElement | null = null;
  private locomotionElement: HTMLElement | null = null;
  private exitButton: HTMLButtonElement | null = null;

  public constructor(options: HudOptions) {
    this.root = options.root;
    this.profile = options.profile;
    this.onExit = options.onExit;
  }

  public start(): void {
    this.root.insertAdjacentHTML("beforeend", `
      <header class="field-hud field-hud--identity">
        <div class="field-portrait" aria-hidden="true"></div>
        <div class="field-character-copy">
          <p>ADVENTURER</p>
          <strong></strong>
          <span class="field-class-label"></span>
          <div class="field-resource-bar field-resource-bar--hp"><i></i><small>HP</small></div>
          <div class="field-resource-bar field-resource-bar--sp"><i></i><small>SP</small></div>
          <span class="field-weapon-label"></span>
        </div>
      </header>
      <aside class="field-hud field-hud--status" aria-label="필드 상태">
        <div class="field-minimap" aria-hidden="true"><i></i><span>◆</span></div>
        <div class="field-location"><small>CURRENT AREA</small><strong>별빛 초원</strong><span>LOCAL EXPEDITION · <b class="field-locomotion">IDLE</b></span></div>
      </aside>
      <div class="field-hint">WASD 이동 · Shift 달리기 · 좌클릭/F 공격 · 마우스 드래그 카메라</div>
      <div class="field-hotbar" aria-label="게임 단축키 바">
        <span class="hotbar-slot is-active"><kbd>1</kbd><b>⚔</b><small>검</small></span>
        <span class="hotbar-slot"><kbd>2</kbd><b>✦</b><small>기술</small></span>
        <button class="hotbar-slot inventory-toggle" type="button" aria-controls="inventory-overlay" aria-expanded="false"><kbd>I</kbd><b>▦</b><small>가방</small></button>
        <span class="hotbar-slot"><kbd>F</kbd><b>◆</b><small>공격</small></span>
      </div>
      <button class="field-exit" type="button"><span>ESC</span> 캐릭터 선택</button>
    `);

    this.nameElement = this.requiredElement<HTMLElement>(".field-character-copy > strong");
    this.classElement = this.requiredElement<HTMLElement>(".field-class-label");
    this.portraitElement = this.requiredElement<HTMLElement>(".field-portrait");
    this.weaponElement = this.requiredElement<HTMLElement>(".field-weapon-label");
    this.locomotionElement = this.requiredElement<HTMLElement>(".field-locomotion");
    this.exitButton = this.requiredElement<HTMLButtonElement>(".field-exit");
    this.exitButton.addEventListener("click", this.onExit);
    this.renderProfile();
  }

  public updateProfile(profile: CharacterProfile): void {
    this.profile = profile;
    this.renderProfile();
  }

  public setLocomotion(state: AnimationState): void {
    if (this.locomotionElement) this.locomotionElement.textContent = state.toUpperCase();
  }

  public dispose(): void {
    this.exitButton?.removeEventListener("click", this.onExit);
    this.nameElement = null;
    this.classElement = null;
    this.portraitElement = null;
    this.weaponElement = null;
    this.locomotionElement = null;
    this.exitButton = null;
  }

  private renderProfile(): void {
    if (!this.nameElement || !this.classElement || !this.portraitElement || !this.weaponElement) return;
    const view = buildHudView(this.profile);
    this.nameElement.textContent = view.characterName;
    this.classElement.textContent = view.classLabel;
    this.portraitElement.textContent = view.classMark;
    this.weaponElement.textContent = view.weaponLabel;
  }

  private requiredElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`HUD element is missing: ${selector}`);
    return element;
  }
}
