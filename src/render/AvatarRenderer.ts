import * as THREE from "three";
import { createRuntimeAvatar } from "../assets/avatar/createRuntimeAvatar";
import type { AvatarGroup, AvatarOutfitId } from "../assets/types";
import type { CharacterProfile } from "../domain/character";
import type { LocomotionState } from "../game/animationState";

const OUTFIT_IDS = new Set<AvatarOutfitId>([
  "outfit.warrior-starter",
  "outfit.mage-starter",
  "outfit.ranger-starter",
  "outfit.traveler",
]);

export class AvatarRenderer {
  public readonly avatar: AvatarGroup;
  private leftArm!: THREE.Object3D;
  private rightArm!: THREE.Object3D;
  private leftLeg!: THREE.Object3D;
  private rightLeg!: THREE.Object3D;
  private chest!: THREE.Object3D;
  private head!: THREE.Object3D;
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
    chestY: 0,
    headZ: 0,
    headY: 0,
  };

  public constructor(parent: THREE.Object3D, profile: CharacterProfile) {
    this.avatar = createRuntimeAvatar({
      body: profile.body,
      classId: profile.classId,
      outfitId: getAvatarOutfitId(profile.equipped.outfit),
    });
    this.avatar.name = "player-avatar";
    parent.add(this.avatar);

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
    this.base.chestY = this.chest.position.y;
    this.base.headZ = this.head.rotation.z;
    this.base.headY = this.head.position.y;
  }

  public face(direction: THREE.Vector3, deltaSeconds: number): void {
    if (direction.lengthSq() < 0.000001) return;
    const desiredYaw = Math.atan2(direction.x, direction.z);
    const turn = shortestAngle(this.avatar.rotation.y, desiredYaw);
    const strength = 1 - Math.exp(-14 * Math.max(deltaSeconds, 0));
    this.avatar.rotation.y += turn * strength;
  }

  public update(deltaSeconds: number, elapsedSeconds: number, state: LocomotionState): void {
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
    this.chest.position.y = THREE.MathUtils.damp(this.chest.position.y, this.base.chestY + bob * 0.38, damping, deltaSeconds);
    this.head.position.y = THREE.MathUtils.damp(this.head.position.y, this.base.headY + bob * 0.18, damping, deltaSeconds);
    this.head.rotation.z = THREE.MathUtils.damp(this.head.rotation.z, this.base.headZ + (moving ? -cycle * 0.018 : Math.sin(elapsedSeconds * 1.3) * 0.018), damping, deltaSeconds);
    this.avatar.position.y = THREE.MathUtils.damp(this.avatar.position.y, bob, damping, deltaSeconds);
  }

  public dispose(): void {
    this.disposed = true;
    this.avatar.userData.disposed = true;
    this.avatar.removeFromParent();
    this.avatar.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
  }
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
