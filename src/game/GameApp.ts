import * as THREE from "three";
import { CLASS_CATALOG, getItemDefinition } from "../domain/catalog";
import type { CharacterProfile } from "../domain/character";
import { equipOwnedItem } from "../domain/equipment";
import { selectLocomotionState } from "./animationState";
import type { LocomotionState } from "./animationState";
import { resolvePlayerMovement } from "./collision";
import { MovementInput } from "./input";
import { getCameraRelativeMovement, getMovementSpeed } from "./movement";
import { AvatarRenderer } from "../render/AvatarRenderer";
import { FIELD_SIZE, createField } from "../render/createField";
import type { FieldRuntime } from "../render/createField";
import { createRenderer } from "../render/createRenderer";
import { EquipmentRenderer } from "../render/EquipmentRenderer";
import { ThirdPersonCamera } from "../render/ThirdPersonCamera";
import { InventoryPanel } from "../ui/InventoryPanel";

export interface GameAppOptions {
  readonly root: HTMLElement;
  readonly profile: CharacterProfile;
  readonly onExit: () => void;
  readonly onProfileChange: (profile: CharacterProfile) => boolean;
}

export class GameApp {
  private readonly root: HTMLElement;
  private profile: CharacterProfile;
  private readonly onExit: () => void;
  private readonly onProfileChange: (profile: CharacterProfile) => boolean;
  private renderer: THREE.WebGLRenderer | null = null;
  private field: FieldRuntime | null = null;
  private cameraController: ThirdPersonCamera | null = null;
  private avatarRenderer: AvatarRenderer | null = null;
  private equipmentRenderer: EquipmentRenderer | null = null;
  private readonly movementInput = new MovementInput();
  private readonly cameraForward = new THREE.Vector3();
  private readonly movementDirection = new THREE.Vector3();
  private readonly actualMovement = new THREE.Vector3();
  private resizeObserver: ResizeObserver | null = null;
  private viewport: HTMLElement | null = null;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock | null = null;
  private fieldShell: HTMLElement | null = null;
  private locomotionElement: HTMLElement | null = null;
  private weaponElement: HTMLElement | null = null;
  private locomotionState: LocomotionState = "idle";
  private inventoryPanel: InventoryPanel | null = null;
  private inventoryOpen = false;

  public constructor(options: GameAppOptions) {
    this.root = options.root;
    this.profile = options.profile;
    this.onExit = options.onExit;
    this.onProfileChange = options.onProfileChange;
  }

  public start(): void {
    const classDefinition = CLASS_CATALOG[this.profile.classId];
    this.root.innerHTML = `
      <main class="field-shell">
        <div class="field-viewport">
          <canvas class="field-canvas" aria-label="별빛 초원 3D 필드"></canvas>
        </div>
        <header class="field-hud field-hud--identity">
          <div class="field-portrait" aria-hidden="true">${classDefinition.label.slice(0, 1)}</div>
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
        <div class="field-hint">WASD 이동 · Shift 달리기 · 마우스 드래그 카메라</div>
        <div class="field-hotbar" aria-label="게임 단축키 바">
          <span class="hotbar-slot is-active"><kbd>1</kbd><b>⚔</b><small>검</small></span>
          <span class="hotbar-slot"><kbd>2</kbd><b>✦</b><small>기술</small></span>
          <button class="hotbar-slot inventory-toggle" type="button" aria-controls="inventory-overlay" aria-expanded="false"><kbd>I</kbd><b>▦</b><small>가방</small></button>
          <span class="hotbar-slot"><kbd>F</kbd><b>◆</b><small>공격</small></span>
        </div>
        <button class="field-exit" type="button"><span>ESC</span> 캐릭터 선택</button>
        <div class="inventory-overlay" id="inventory-overlay" hidden aria-hidden="true"></div>
      </main>
    `;

    const name = this.requiredElement<HTMLElement>(".field-character-copy > strong");
    const classLabel = this.requiredElement<HTMLElement>(".field-class-label");
    name.textContent = this.profile.name;
    classLabel.textContent = classDefinition.label;
    this.weaponElement = this.requiredElement<HTMLElement>(".field-weapon-label");
    this.updateEquipmentHud();

    const canvas = this.requiredElement<HTMLCanvasElement>(".field-canvas");
    this.fieldShell = this.requiredElement<HTMLElement>(".field-shell");
    this.fieldShell.dataset.playerX = "0.00";
    this.fieldShell.dataset.playerZ = "0.00";
    this.fieldShell.dataset.locomotion = "idle";
    this.fieldShell.dataset.inventoryOpen = "false";
    this.viewport = this.requiredElement<HTMLElement>(".field-viewport");
    this.locomotionElement = this.requiredElement<HTMLElement>(".field-locomotion");
    this.requiredElement<HTMLButtonElement>(".field-exit").addEventListener("click", this.onExit);

    this.renderer = createRenderer(canvas);
    this.field = createField();
    this.avatarRenderer = new AvatarRenderer(this.field.playerTarget, this.profile);
    this.equipmentRenderer = new EquipmentRenderer(this.avatarRenderer.avatar);
    this.equipmentRenderer.sync(this.profile);
    this.inventoryPanel = new InventoryPanel({
      root: this.requiredElement<HTMLElement>(".inventory-overlay"),
      toggleButton: this.requiredElement<HTMLButtonElement>(".inventory-toggle"),
      profile: this.profile,
      onEquip: this.handleEquip,
      onOpenChange: this.handleInventoryOpenChange,
    });
    this.inventoryPanel.start();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    this.cameraController = new ThirdPersonCamera(camera, this.field.playerTarget, 2.55);
    this.cameraController.connect(canvas);
    this.movementInput.connect();
    this.clock = new THREE.Clock();

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.viewport);
    window.addEventListener("resize", this.handleResize);
    this.resizeRenderer();
    this.cameraController.update(0);
    this.animationFrameId = requestAnimationFrame(this.renderFrame);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.handleResize);
    this.viewport = null;
    this.fieldShell = null;
    this.locomotionElement = null;
    this.weaponElement = null;
    this.viewportWidth = 0;
    this.viewportHeight = 0;
    this.cameraController?.dispose();
    this.cameraController = null;
    this.inventoryPanel?.dispose();
    this.inventoryPanel = null;
    this.inventoryOpen = false;
    this.movementInput.disconnect();
    this.equipmentRenderer?.dispose();
    this.equipmentRenderer = null;
    this.avatarRenderer?.dispose();
    this.avatarRenderer = null;
    this.field?.dispose();
    this.field = null;
    this.renderer?.dispose();
    this.renderer = null;
    this.clock = null;
  }

  private readonly renderFrame = (): void => {
    if (!this.renderer || !this.field || !this.cameraController || !this.avatarRenderer || !this.clock) return;
    this.resizeRenderer();
    const deltaSeconds = Math.min(this.clock.getDelta(), 0.1);
    this.updatePlayer(deltaSeconds);
    this.cameraController.update(deltaSeconds);
    this.renderer.render(this.field.scene, this.cameraController.camera);
    this.animationFrameId = requestAnimationFrame(this.renderFrame);
  };

  private updatePlayer(deltaSeconds: number): void {
    if (!this.field || !this.cameraController || !this.avatarRenderer || !this.clock) return;
    const input = this.inventoryOpen
      ? { forward: 0, right: 0, sprint: false }
      : this.movementInput.read();
    this.cameraController.camera.getWorldDirection(this.cameraForward);
    getCameraRelativeMovement(input, this.cameraForward, this.movementDirection);

    const current = this.field.playerTarget.position;
    const speed = getMovementSpeed(input.sprint);
    const desired = {
      x: current.x + this.movementDirection.x * speed * deltaSeconds,
      z: current.z + this.movementDirection.z * speed * deltaSeconds,
    };
    const resolved = resolvePlayerMovement(current, desired, 0.48, FIELD_SIZE / 2, this.field.colliders);
    this.actualMovement.set(resolved.x - current.x, 0, resolved.z - current.z);
    current.set(resolved.x, 0, resolved.z);
    if (this.fieldShell) {
      this.fieldShell.dataset.playerX = resolved.x.toFixed(2);
      this.fieldShell.dataset.playerZ = resolved.z.toFixed(2);
    }

    this.avatarRenderer.face(this.movementDirection, deltaSeconds);
    const state = selectLocomotionState(this.actualMovement.lengthSq() > 0.000001, input.sprint);
    if (state !== this.locomotionState) {
      this.locomotionState = state;
      if (this.locomotionElement) this.locomotionElement.textContent = state.toUpperCase();
      if (this.fieldShell) this.fieldShell.dataset.locomotion = state;
    }
    this.avatarRenderer.update(deltaSeconds, this.clock.elapsedTime, state);
  }

  private readonly handleEquip = (itemId: string): boolean => {
    const result = equipOwnedItem(this.profile, itemId);
    if (!result.ok || !this.onProfileChange(result.profile)) return false;
    this.profile = result.profile;
    this.equipmentRenderer?.sync(this.profile);
    this.inventoryPanel?.updateProfile(this.profile);
    this.updateEquipmentHud();
    return true;
  };

  private readonly handleInventoryOpenChange = (open: boolean): void => {
    this.inventoryOpen = open;
    this.movementInput.setEnabled(!open);
    this.fieldShell?.classList.toggle("is-inventory-open", open);
    if (this.fieldShell) this.fieldShell.dataset.inventoryOpen = String(open);
  };

  private updateEquipmentHud(): void {
    if (!this.weaponElement) return;
    const weaponId = this.profile.equipped.weapon;
    const weapon = weaponId ? getItemDefinition(weaponId) : undefined;
    this.weaponElement.textContent = `장착 검 · ${weapon?.label ?? "없음"}`;
  }

  private readonly handleResize = (): void => {
    this.resizeRenderer();
  };

  private resizeRenderer(): void {
    if (!this.renderer || !this.cameraController || !this.field || !this.viewport) return;
    const width = Math.max(this.viewport.clientWidth, 1);
    const height = Math.max(this.viewport.clientHeight, 1);
    if (width === this.viewportWidth && height === this.viewportHeight) return;

    this.viewportWidth = width;
    this.viewportHeight = height;
    this.renderer.setSize(width, height, false);
    this.cameraController.resize(width, height);
    this.cameraController.update(0);
    this.renderer.render(this.field.scene, this.cameraController.camera);
  }

  private requiredElement<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Field element is missing: ${selector}`);
    return element;
  }
}
