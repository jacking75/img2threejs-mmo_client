import * as THREE from "three";
import type { CharacterProfile } from "../domain/character";
import { equipOwnedItem } from "../domain/equipment";
import {
  advanceAttack,
  createAttackTimeline,
  getAttackProgress,
  isAttackMovementLocked,
  selectAnimationState,
  startAttack,
} from "./animationState";
import type { AnimationState, AttackTimeline } from "./animationState";
import { resolvePlayerMovement } from "./collision";
import { AttackInput, MovementInput } from "./input";
import { getCameraRelativeMovement, getMovementSpeed } from "./movement";
import { AvatarRenderer } from "../render/AvatarRenderer";
import { FIELD_SIZE, createField } from "../render/createField";
import type { FieldRuntime } from "../render/createField";
import { createRenderer } from "../render/createRenderer";
import { EquipmentRenderer } from "../render/EquipmentRenderer";
import { ThirdPersonCamera } from "../render/ThirdPersonCamera";
import { Hud } from "../ui/Hud";
import { InventoryPanel } from "../ui/InventoryPanel";

export const FIELD_AVATAR_SCALE = 0.36;
export const FIELD_CAMERA_FOV = 52;
export const FIELD_CAMERA_TARGET_HEIGHT = 1.25;
export const FIELD_CAMERA_FAR = 360;

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
  private readonly attackInput = new AttackInput();
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
  private hud: Hud | null = null;
  private animationState: AnimationState = "idle";
  private attackTimeline: AttackTimeline = createAttackTimeline();
  private attackCount = 0;
  private inventoryPanel: InventoryPanel | null = null;
  private inventoryOpen = false;

  public constructor(options: GameAppOptions) {
    this.root = options.root;
    this.profile = options.profile;
    this.onExit = options.onExit;
    this.onProfileChange = options.onProfileChange;
  }

  public start(): void {
    this.root.innerHTML = `
      <main class="field-shell">
        <div class="field-viewport">
          <canvas class="field-canvas" aria-label="별빛 초원 3D 필드"></canvas>
        </div>
        <div class="inventory-overlay" id="inventory-overlay" hidden aria-hidden="true"></div>
      </main>
    `;

    const canvas = this.requiredElement<HTMLCanvasElement>(".field-canvas");
    this.fieldShell = this.requiredElement<HTMLElement>(".field-shell");
    this.fieldShell.dataset.playerX = "0.00";
    this.fieldShell.dataset.playerZ = "0.00";
    this.fieldShell.dataset.locomotion = "idle";
    this.fieldShell.dataset.animation = "idle";
    this.fieldShell.dataset.attackCount = "0";
    this.fieldShell.dataset.inventoryOpen = "false";
    this.fieldShell.dataset.fieldSize = String(FIELD_SIZE);
    this.fieldShell.dataset.avatarScale = String(FIELD_AVATAR_SCALE);
    this.fieldShell.dataset.cameraFov = String(FIELD_CAMERA_FOV);
    this.viewport = this.requiredElement<HTMLElement>(".field-viewport");
    this.hud = new Hud({ root: this.fieldShell, profile: this.profile, onExit: this.onExit });
    this.hud.start();

    this.renderer = createRenderer(canvas);
    this.field = createField();
    this.avatarRenderer = new AvatarRenderer(this.field.playerTarget, this.profile, {
      visualScale: FIELD_AVATAR_SCALE,
    });
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
    const camera = new THREE.PerspectiveCamera(FIELD_CAMERA_FOV, 1, 0.1, FIELD_CAMERA_FAR);
    this.cameraController = new ThirdPersonCamera(
      camera,
      this.field.playerTarget,
      FIELD_CAMERA_TARGET_HEIGHT,
    );
    this.cameraController.connect(canvas);
    this.movementInput.connect();
    this.attackInput.connect(canvas);
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
    this.hud?.dispose();
    this.hud = null;
    this.viewportWidth = 0;
    this.viewportHeight = 0;
    this.cameraController?.dispose();
    this.cameraController = null;
    this.inventoryPanel?.dispose();
    this.inventoryPanel = null;
    this.inventoryOpen = false;
    this.movementInput.disconnect();
    this.attackInput.disconnect();
    this.attackTimeline = createAttackTimeline();
    this.attackCount = 0;
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
    if (this.attackInput.consumeRequest() && !this.inventoryOpen) {
      const result = startAttack(this.attackTimeline);
      this.attackTimeline = result.timeline;
      if (result.started) {
        this.attackCount += 1;
        if (this.fieldShell) this.fieldShell.dataset.attackCount = String(this.attackCount);
      }
    }
    this.attackTimeline = advanceAttack(this.attackTimeline, deltaSeconds);

    const input = this.inventoryOpen
      ? { forward: 0, right: 0, sprint: false }
      : this.movementInput.read();
    this.cameraController.camera.getWorldDirection(this.cameraForward);
    getCameraRelativeMovement(input, this.cameraForward, this.movementDirection);

    const current = this.field.playerTarget.position;
    const speed = getMovementSpeed(input.sprint);
    const movementScale = isAttackMovementLocked(this.attackTimeline) ? 0 : 1;
    const desired = {
      x: current.x + this.movementDirection.x * speed * deltaSeconds * movementScale,
      z: current.z + this.movementDirection.z * speed * deltaSeconds * movementScale,
    };
    const resolved = resolvePlayerMovement(current, desired, 0.48, FIELD_SIZE / 2, this.field.colliders);
    this.actualMovement.set(resolved.x - current.x, 0, resolved.z - current.z);
    current.set(resolved.x, 0, resolved.z);
    if (this.fieldShell) {
      this.fieldShell.dataset.playerX = resolved.x.toFixed(2);
      this.fieldShell.dataset.playerZ = resolved.z.toFixed(2);
    }

    if (!this.attackTimeline.active) this.avatarRenderer.face(this.movementDirection, deltaSeconds);
    const state = selectAnimationState(
      this.attackTimeline.active,
      this.actualMovement.lengthSq() > 0.000001,
      input.sprint,
    );
    if (state !== this.animationState) {
      this.animationState = state;
      this.hud?.setLocomotion(state);
      if (this.fieldShell) {
        this.fieldShell.dataset.locomotion = state === "attack_1" ? "attack" : state;
        this.fieldShell.dataset.animation = state;
      }
    }
    this.avatarRenderer.update(
      deltaSeconds,
      this.clock.elapsedTime,
      state,
      getAttackProgress(this.attackTimeline),
    );
  }

  private readonly handleEquip = (itemId: string): boolean => {
    const result = equipOwnedItem(this.profile, itemId);
    if (!result.ok || !this.onProfileChange(result.profile)) return false;
    this.profile = result.profile;
    this.equipmentRenderer?.sync(this.profile);
    this.inventoryPanel?.updateProfile(this.profile);
    this.hud?.updateProfile(this.profile);
    return true;
  };

  private readonly handleInventoryOpenChange = (open: boolean): void => {
    this.inventoryOpen = open;
    this.movementInput.setEnabled(!open);
    this.attackInput.setEnabled(!open);
    this.fieldShell?.classList.toggle("is-inventory-open", open);
    if (this.fieldShell) this.fieldShell.dataset.inventoryOpen = String(open);
  };

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
