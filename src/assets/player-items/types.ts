import type * as THREE from "three";

export type PlayerItemCategory = "weapon" | "outfit" | "head" | "accessory";

export type PlayerItemTheme = "frontier" | "royal" | "moon" | "infernal";

export type WeaponArchetype =
  | "longsword"
  | "greatsword"
  | "rapier"
  | "dagger"
  | "twinblade"
  | "battleaxe"
  | "greataxe"
  | "warhammer"
  | "maul"
  | "spear"
  | "halberd"
  | "glaive"
  | "longbow"
  | "staff"
  | "wand"
  | "gauntlet"
  | "chakram"
  | "scythe";

export type OutfitArchetype =
  | "adventurer"
  | "plate"
  | "chainmail"
  | "leather"
  | "ranger"
  | "mage"
  | "priest"
  | "assassin"
  | "noble"
  | "sailor"
  | "smith"
  | "dragon";

export type HeadArchetype = "sallet" | "greathelm" | "hood" | "circlet" | "witchhat" | "hornedhelm";

export type AccessoryArchetype = "roundshield" | "towershield" | "cape" | "quiver" | "spellbook" | "lantern";

export type PlayerItemArchetype = WeaponArchetype | OutfitArchetype | HeadArchetype | AccessoryArchetype;

export interface PlayerItemDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: PlayerItemCategory;
  readonly subtype: PlayerItemArchetype;
  readonly theme: PlayerItemTheme;
  readonly tags: readonly string[];
  readonly create: () => THREE.Group;
}

export interface ResourceAttachmentMetadata {
  readonly socket: "hand.R" | "hand.L" | "head" | "back" | "chest";
  readonly anchorNode: "grip" | "head" | "back" | "chest";
  readonly position: readonly [number, number, number];
  readonly forwardAxis: "+Z";
  readonly upAxis: "+Y";
}
