import * as THREE from "three";
import {
  createAvatarOutfitVisual,
  getDefaultAvatarOutfitId,
} from "../assets/avatar/createAnimeAvatar";
import { applyImportedOutfit } from "../assets/avatar/createRuntimeAvatar";
import { createStarterCap } from "../assets/equipment/createHeadEquipment";
import { createMoonSword, createTrainingSword } from "../assets/equipment/createSword";
import type { AvatarGroup, AvatarOutfitId } from "../assets/types";
import type { CharacterProfile, EquipmentSlot } from "../domain/character";

export interface EquipmentVisual {
  readonly itemId: string;
  readonly slot: "weapon" | "head";
  create(): THREE.Group;
}

const createEmptyHead = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = "head.none";
  return group;
};

export const EQUIPMENT_VISUALS: Readonly<Record<string, EquipmentVisual>> = {
  "weapon.training-sword": {
    itemId: "weapon.training-sword",
    slot: "weapon",
    create: createTrainingSword,
  },
  "weapon.moon-sword": {
    itemId: "weapon.moon-sword",
    slot: "weapon",
    create: createMoonSword,
  },
  "head.none": {
    itemId: "head.none",
    slot: "head",
    create: createEmptyHead,
  },
  "head.starter-cap": {
    itemId: "head.starter-cap",
    slot: "head",
    create: createStarterCap,
  },
};

export class EquipmentRenderer {
  private handSocket!: THREE.Object3D;
  private headSocket!: THREE.Object3D;
  private outfitRootMount!: THREE.Object3D;
  private outfitChestMount!: THREE.Object3D;
  private readonly activeVisuals: Partial<Record<"weapon" | "head", THREE.Group>> = {};
  private readonly activeItemIds: Partial<Record<EquipmentSlot, string | null>> = {};
  private disposed = false;

  public constructor(private readonly avatar: AvatarGroup) {
    this.bindRuntime();
    this.activeItemIds.outfit = avatar.userData.avatarOptions.outfitId
      ?? getDefaultAvatarOutfitId(avatar.userData.avatarOptions.classId);
    void avatar.userData.assetReady?.then(() => {
      if (!this.disposed) this.bindRuntime();
    });
  }

  public sync(profile: CharacterProfile): void {
    this.syncAttachedVisual("weapon", profile.equipped.weapon, this.handSocket);
    this.syncAttachedVisual("head", profile.equipped.head, this.headSocket);
    this.syncOutfit(profile.equipped.outfit);
  }

  public getActiveItemId(slot: EquipmentSlot): string | null {
    return this.activeItemIds[slot] ?? null;
  }

  public getActiveVisual(slot: "weapon" | "head"): THREE.Group | null {
    return this.activeVisuals[slot] ?? null;
  }

  public dispose(): void {
    this.disposed = true;
    this.clearAttachedVisual("weapon");
    this.clearAttachedVisual("head");
    clearMount(this.outfitRootMount);
    clearMount(this.outfitChestMount);
    this.activeItemIds.outfit = null;
  }

  private syncAttachedVisual(
    slot: "weapon" | "head",
    itemId: string | null,
    socket: THREE.Object3D,
  ): void {
    if (this.activeItemIds[slot] === itemId) return;
    this.clearAttachedVisual(slot);
    this.activeItemIds[slot] = itemId;
    if (!itemId) return;

    const definition = EQUIPMENT_VISUALS[itemId];
    if (!definition || definition.slot !== slot) return;
    const visual = definition.create();
    visual.userData.itemId = itemId;
    if (slot === "weapon") {
      visual.rotation.set(0.08, 0, this.avatar.userData.assetSource === "blender-glb" ? 0 : Math.PI);
      visual.position.set(0, -0.15, 0.08);
    } else if (itemId === "head.starter-cap" && this.avatar.userData.assetSource === "blender-glb") {
      // GLB의 head 소켓은 절차형 머리보다 위에 있으므로 낮고 약간 작게 맞춘다.
      visual.position.set(0, -0.3, 0);
      visual.scale.setScalar(0.9);
    }
    socket.add(visual);
    this.activeVisuals[slot] = visual;
  }

  private clearAttachedVisual(slot: "weapon" | "head"): void {
    const visual = this.activeVisuals[slot];
    if (!visual) return;
    visual.removeFromParent();
    disposeObject(visual);
    this.activeVisuals[slot] = undefined;
  }

  private syncOutfit(itemId: string | null): void {
    if (this.activeItemIds.outfit === itemId || !isAvatarOutfitId(itemId)) return;
    clearMount(this.outfitRootMount);
    clearMount(this.outfitChestMount);
    if (applyImportedOutfit(this.avatar, itemId)) {
      this.activeItemIds.outfit = itemId;
      this.avatar.userData.avatarOptions = { ...this.avatar.userData.avatarOptions, outfitId: itemId };
      return;
    }
    const outfit = createAvatarOutfitVisual(itemId, this.avatar.userData.avatarOptions.body);
    this.outfitRootMount.add(outfit.root);
    this.outfitChestMount.add(outfit.chest);
    this.activeItemIds.outfit = itemId;
    this.avatar.userData.avatarOptions = {
      ...this.avatar.userData.avatarOptions,
      outfitId: itemId,
    };
  }

  private bindRuntime(): void {
    const runtime = this.avatar.userData.sculptRuntime;
    this.handSocket = runtime.sockets["hand.R"];
    this.headSocket = runtime.sockets.head;
    this.outfitRootMount = requiredNode(runtime.nodes, "outfit.mount.root");
    this.outfitChestMount = requiredNode(runtime.nodes, "outfit.mount.chest");
  }
}

function isAvatarOutfitId(itemId: string | null): itemId is AvatarOutfitId {
  return itemId === "outfit.warrior-starter"
    || itemId === "outfit.mage-starter"
    || itemId === "outfit.ranger-starter"
    || itemId === "outfit.traveler";
}

function requiredNode(nodes: Readonly<Record<string, THREE.Object3D>>, name: string): THREE.Object3D {
  const node = nodes[name];
  if (!node) throw new Error(`Avatar equipment node is missing: ${name}`);
  return node;
}

function clearMount(mount: THREE.Object3D): void {
  for (const child of [...mount.children]) {
    child.removeFromParent();
    disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
