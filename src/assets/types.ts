import type * as THREE from "three";
import type { BodyPresentation, CharacterClass } from "../domain/character";

export type { BodyPresentation, CharacterClass } from "../domain/character";

export type AvatarOutfitId =
  | "outfit.warrior-starter"
  | "outfit.mage-starter"
  | "outfit.ranger-starter"
  | "outfit.traveler";

export interface AvatarOptions {
  readonly body: BodyPresentation;
  readonly classId: CharacterClass;
  readonly outfitId?: AvatarOutfitId;
}

export interface SculptRuntime {
  readonly nodes: Readonly<Record<string, THREE.Object3D>>;
  readonly sockets: Readonly<Record<"hand.R" | "hand.L" | "head" | "back", THREE.Object3D>>;
  readonly colliders: readonly THREE.Object3D[];
  readonly destructionGroups: Readonly<Record<string, readonly string[]>>;
}

export interface AssetDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: "avatar" | "weapon" | "equipment" | "field";
  readonly create: () => THREE.Group;
}

export type AvatarGroup = THREE.Group & {
  userData: THREE.Group["userData"] & {
    sculptRuntime: SculptRuntime;
    avatarOptions: AvatarOptions;
    assetSource?: "procedural" | "blender-glb";
    assetReady?: Promise<void>;
    disposed?: boolean;
    img2threejs: Readonly<Record<string, unknown>>;
  };
};
