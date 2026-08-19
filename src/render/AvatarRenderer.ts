import * as THREE from "three";
import { createRuntimeAvatar } from "../assets/avatar/createRuntimeAvatar";
import type { AvatarGroup, AvatarOutfitId } from "../assets/types";
import type { CharacterProfile } from "../domain/character";
import type { AnimationState } from "../game/animationState";

const OUTFIT_IDS = new Set<AvatarOutfitId>([
  "outfit.warrior-starter",
  "outfit.mage-starter",
  "outfit.ranger-starter",
  "outfit.traveler",
]);

export interface AvatarRendererOptions {
  readonly visualScale?: number;
  readonly createAvatar?: typeof createRuntimeAvatar;
}

export class AvatarRenderer {
  public readonly avatar: AvatarGroup;
  private leftArm!: THREE.Object3D;
  private rightArm!: THREE.Object3D;
  private leftLeg!: THREE.Object3D;
  private rightLeg!: THREE.Object3D;
  private chest!: THREE.Object3D;
  private head!: THREE.Object3D;
  private readonly attackEffect: THREE.Group;
  private readonly attackEffectMaterial: THREE.MeshBasicMaterial;
  private readonly visualScale: number;
  private disposed = false;
  private readonly base = {
    leftArmX: 0,
    leftArmZ: 0,
    rightArmX: 0,
    rightArmZ: 0,
    leftLegX: 0,
    rightLegX: 0,
    chestX: 0,
    chestZ: 0,
    chestRotationY: 0,
    chestY: 0,
    headZ: 0,
    headY: 0,
    avatarZ: 0,
  };

  public constructor(
    parent: THREE.Object3D,
    profile: CharacterProfile,
    options: AvatarRendererOptions = {},
  ) {
    this.visualScale = options.visualScale ?? 1;
    this.avatar = (options.createAvatar ?? createRuntimeAvatar)({
      body: profile.body,
      classId: profile.classId,
      outfitId: getAvatarOutfitId(profile.equipped.outfit),
    });
    this.avatar.name = "player-avatar";
    this.avatar.scale.setScalar(this.visualScale);
    parent.add(this.avatar);
    const attackEffect = createAttackEffect();
    this.attackEffect = attackEffect.group;
    this.attackEffectMaterial = attackEffect.material;
    parent.add(this.attackEffect);

    this.bindRuntimeNodes();
    void this.avatar.userData.assetReady?.then(() => {
      if (!this.disposed) this.bindRuntimeNodes();
    });
  }

  private bindRuntimeNodes(): void {
    const nodes = this.avatar.userData.sculptRuntime.nodes;
    this.leftArm = requiredNode(nodes, "arm.L.upper");
    this.rightArm = requiredNode(nodes, "arm.R.upper");
    this.leftLeg = requiredNode(nodes, "leg.L.upper");
    this.rightLeg = requiredNode(nodes, "leg.R.upper");
    this.chest = requiredNode(nodes, "chest");
    this.head = requiredNode(nodes, "head");
    this.base.leftArmX = this.leftArm.rotation.x;
    this.base.leftArmZ = this.leftArm.rotation.z;
    this.base.rightArmX = this.rightArm.rotation.x;
    this.base.rightArmZ = this.rightArm.rotation.z;
    this.base.leftLegX = this.leftLeg.rotation.x;
    this.base.rightLegX = this.rightLeg.rotation.x;
    this.base.chestX = this.chest.rotation.x;
    this.base.chestZ = this.chest.rotation.z;
    this.base.chestRotationY = this.chest.rotation.y;
    this.base.chestY = this.chest.position.y;
    this.base.headZ = this.head.rotation.z;
    this.base.headY = this.head.position.y;
    this.base.avatarZ = this.avatar.position.z;
  }

  public face(direction: THREE.Vector3, deltaSeconds: number): void {
    if (direction.lengthSq() < 0.000001) return;
    const desiredYaw = Math.atan2(direction.x, direction.z);
    const turn = shortestAngle(this.avatar.rotation.y, desiredYaw);
    const strength = 1 - Math.exp(-14 * Math.max(deltaSeconds, 0));
    this.avatar.rotation.y += turn * strength;
  }

  public update(
    deltaSeconds: number,
    elapsedSeconds: number,
    state: AnimationState,
    attackProgress = 0,
  ): void {
    if (!this.avatar.visible) {
      this.updateAttackEffect(0);
      return;
    }
    if (this.avatar.userData.animationRuntime?.update(state, deltaSeconds) === true) {
      this.updateAttackEffect(state === "attack_1" ? attackProgress : 0);
      return;
    }
    if (state === "attack_1") {
      this.updateAttack(deltaSeconds, attackProgress);
      return;
    }

    const moving = state !== "idle";
    const frequency = state === "sprint" ? 12 : state === "run" ? 8.5 : 2.1;
    const stride = state === "sprint" ? 0.8 : state === "run" ? 0.56 : 0.035;
    const cycle = Math.sin(elapsedSeconds * frequency);
    const bounceCycle = Math.abs(Math.sin(elapsedSeconds * frequency));
    const bob = moving ? bounceCycle * (state === "sprint" ? 0.105 : 0.065) : Math.sin(elapsedSeconds * frequency) * 0.025;
    const armTarget = cycle * stride;
    const legTarget = -cycle * stride * 0.9;
    const leanTarget = moving ? (state === "sprint" ? 0.14 : 0.07) : 0;
    const damping = moving ? 18 : 10;

    this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, this.base.leftArmX + armTarget, damping, deltaSeconds);
    this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, this.base.rightArmX - armTarget, damping, deltaSeconds);
    this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, this.base.leftLegX + legTarget, damping, deltaSeconds);
    this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, this.base.rightLegX - legTarget, damping, deltaSeconds);
    this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, this.base.leftArmZ, damping, deltaSeconds);
    this.rightArm.rotation.z = THREE.MathUtils.damp(this.rightArm.rotation.z, this.base.rightArmZ, damping, deltaSeconds);
    this.chest.rotation.x = THREE.MathUtils.damp(this.chest.rotation.x, this.base.chestX + leanTarget, damping, deltaSeconds);
    this.chest.rotation.z = THREE.MathUtils.damp(this.chest.rotation.z, this.base.chestZ + (moving ? cycle * 0.025 : Math.sin(elapsedSeconds * 1.4) * 0.012), damping, deltaSeconds);
    this.chest.rotation.y = THREE.MathUtils.damp(this.chest.rotation.y, this.base.chestRotationY, damping, deltaSeconds);
    this.chest.position.y = THREE.MathUtils.damp(this.chest.position.y, this.base.chestY + bob * 0.38, damping, deltaSeconds);
    this.head.position.y = THREE.MathUtils.damp(this.head.position.y, this.base.headY + bob * 0.18, damping, deltaSeconds);
    this.head.rotation.z = THREE.MathUtils.damp(this.head.rotation.z, this.base.headZ + (moving ? -cycle * 0.018 : Math.sin(elapsedSeconds * 1.3) * 0.018), damping, deltaSeconds);
    this.avatar.position.y = THREE.MathUtils.damp(this.avatar.position.y, bob, damping, deltaSeconds);
    this.avatar.position.z = THREE.MathUtils.damp(this.avatar.position.z, this.base.avatarZ, damping, deltaSeconds);
    this.updateAttackEffect(0);
  }

  private updateAttack(deltaSeconds: number, progress: number): void {
    const windup = smoothStep(0, 0.24, progress);
    const slash = smoothStep(0.24, 0.58, progress);
    const recovery = smoothStep(0.58, 1, progress);
    const rightArmX = THREE.MathUtils.lerp(-0.92, 0.54, slash);
    const rightArmZ = THREE.MathUtils.lerp(0.58, -1.04, slash);
    const chestYaw = THREE.MathUtils.lerp(-0.42, 0.52, slash);
    const lunge = Math.sin(Math.min(progress, 1) * Math.PI) * 0.2;
    const blend = 1 - recovery;
    const damping = 30;

    this.rightArm.rotation.x = THREE.MathUtils.damp(
      this.rightArm.rotation.x,
      this.base.rightArmX + rightArmX * Math.max(windup, blend),
      damping,
      deltaSeconds,
    );
    this.rightArm.rotation.z = THREE.MathUtils.damp(
      this.rightArm.rotation.z,
      this.base.rightArmZ + rightArmZ * Math.max(windup, blend),
      damping,
      deltaSeconds,
    );
    this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, this.base.leftArmX + 0.24 * blend, damping, deltaSeconds);
    this.leftArm.rotation.z = THREE.MathUtils.damp(this.leftArm.rotation.z, this.base.leftArmZ - 0.18 * blend, damping, deltaSeconds);
    this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, this.base.leftLegX - 0.18 * blend, damping, deltaSeconds);
    this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, this.base.rightLegX + 0.3 * blend, damping, deltaSeconds);
    this.chest.rotation.x = THREE.MathUtils.damp(this.chest.rotation.x, this.base.chestX + 0.08 * blend, damping, deltaSeconds);
    this.chest.rotation.z = THREE.MathUtils.damp(this.chest.rotation.z, this.base.chestZ - 0.08 * blend, damping, deltaSeconds);
    this.chest.rotation.y = THREE.MathUtils.damp(this.chest.rotation.y, this.base.chestRotationY + chestYaw * blend, damping, deltaSeconds);
    this.chest.position.y = THREE.MathUtils.damp(this.chest.position.y, this.base.chestY - 0.04 * blend, damping, deltaSeconds);
    this.head.position.y = THREE.MathUtils.damp(this.head.position.y, this.base.headY, damping, deltaSeconds);
    this.head.rotation.z = THREE.MathUtils.damp(this.head.rotation.z, this.base.headZ + 0.05 * blend, damping, deltaSeconds);
    this.avatar.position.y = THREE.MathUtils.damp(this.avatar.position.y, 0, damping, deltaSeconds);
    this.avatar.position.z = THREE.MathUtils.damp(this.avatar.position.z, this.base.avatarZ + lunge, damping, deltaSeconds);
    this.updateAttackEffect(progress);
  }

  private updateAttackEffect(progress: number): void {
    const visibleProgress = THREE.MathUtils.clamp((progress - 0.27) / 0.34, 0, 1);
    const fade = 1 - THREE.MathUtils.clamp((progress - 0.61) / 0.17, 0, 1);
    this.attackEffect.visible = visibleProgress > 0 && fade > 0;
    this.attackEffectMaterial.opacity = visibleProgress * fade * 0.48;
    this.attackEffect.position.copy(this.avatar.position);
    this.attackEffect.position.y += 2.15 * this.visualScale;
    this.attackEffect.position.z += 0.42 * this.visualScale;
    this.attackEffect.rotation.y = this.avatar.rotation.y;
    this.attackEffect.rotation.z = THREE.MathUtils.lerp(0.68, -0.48, visibleProgress);
    this.attackEffect.scale.setScalar(
      THREE.MathUtils.lerp(0.78, 1.06, visibleProgress) * this.visualScale,
    );
  }

  public dispose(): void {
    this.disposed = true;
    this.avatar.userData.disposed = true;
    this.avatar.userData.animationRuntime?.dispose();
    this.avatar.userData.animationRuntime = undefined;
    this.avatar.removeFromParent();
    this.attackEffect.removeFromParent();
    this.attackEffect.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    this.attackEffectMaterial.dispose();
    this.avatar.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
  }
}

function createAttackEffect(): { group: THREE.Group; material: THREE.MeshBasicMaterial } {
  const shape = new THREE.Shape();
  const start = -0.82;
  const end = 0.82;
  shape.absarc(0, 0, 2.05, start, end, false);
  shape.absarc(0, 0, 1.62, end, start, true);
  shape.closePath();
  const material = new THREE.MeshBasicMaterial({
    color: 0xc9efff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 28), material);
  mesh.name = "attack_1.sword-arc";
  const group = new THREE.Group();
  group.name = "attack_1.effect";
  group.visible = false;
  group.add(mesh);
  return { group, material };
}

function smoothStep(min: number, max: number, value: number): number {
  const x = THREE.MathUtils.clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

function getAvatarOutfitId(itemId: string | null): AvatarOutfitId | undefined {
  return itemId && OUTFIT_IDS.has(itemId as AvatarOutfitId) ? itemId as AvatarOutfitId : undefined;
}

function requiredNode(nodes: Readonly<Record<string, THREE.Object3D>>, name: string): THREE.Object3D {
  const node = nodes[name];
  if (!node) throw new Error(`Avatar animation node is missing: ${name}`);
  return node;
}

function shortestAngle(from: number, to: number): number {
  return THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}
