import type * as THREE from "three";
import type { AvatarGroup, BodyPresentation, CharacterClass } from "../types";

export const NPC_FACTION_IDS = ["greenward", "sunreach", "frostmarch"] as const;
export type NpcFactionId = (typeof NPC_FACTION_IDS)[number];

export const NPC_ARCHETYPE_IDS = [
  "merchant",
  "blacksmith",
  "guard",
  "noble",
  "farmer",
  "miner",
  "sailor",
  "scholar",
  "cleric",
  "alchemist",
  "bard",
  "healer",
  "hunter",
  "guild-receptionist",
  "cook",
  "fisher",
  "stable-keeper",
  "librarian",
  "monk",
  "desert-nomad",
  "northern-warrior",
  "elven-artisan",
  "dwarf-engineer",
  "beastfolk-scout",
] as const;
export type NpcArchetypeId = (typeof NPC_ARCHETYPE_IDS)[number];

export interface NpcArchetype {
  readonly id: NpcArchetypeId;
  readonly label: string;
  readonly body: BodyPresentation;
  readonly classId: CharacterClass;
  readonly signatureParts: readonly string[];
  readonly tags: readonly string[];
}

export interface NpcFaction {
  readonly id: NpcFactionId;
  readonly label: string;
  readonly primary: number;
  readonly secondary: number;
  readonly accent: number;
  readonly motif: "leaf" | "sun" | "rune";
}

export interface NpcResourceDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: "npc";
  readonly archetypeId: NpcArchetypeId;
  readonly factionId: NpcFactionId;
  readonly tags: readonly string[];
  readonly signatureParts: readonly string[];
  readonly create: () => NpcResourceGroup;
}

export type NpcResourceGroup = AvatarGroup & {
  userData: AvatarGroup["userData"] & {
    npcResource: {
      readonly id: string;
      readonly archetypeId: NpcArchetypeId;
      readonly factionId: NpcFactionId;
      readonly provenance: "original-procedural";
      readonly quality: "gallery-ready";
      readonly socketContract: readonly ["hand.R", "hand.L", "head", "back"];
      readonly signatureParts: readonly string[];
    };
  };
};

export interface NpcBuildContext {
  readonly root: NpcResourceGroup;
  readonly archetype: NpcArchetype;
  readonly faction: NpcFaction;
  readonly head: THREE.Object3D;
  readonly handRight: THREE.Object3D;
  readonly handLeft: THREE.Object3D;
  readonly back: THREE.Object3D;
  readonly chest: THREE.Object3D;
}
