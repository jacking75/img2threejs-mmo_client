import type * as THREE from "three";

export type CreatureBodyPlan = "blob" | "biped" | "quadruped" | "insect" | "flying" | "construct";
export type CreatureAffinityId = "verdant" | "ember" | "frost" | "void";

export interface CreatureArchetype {
  readonly id: string;
  readonly label: string;
  readonly bodyPlan: CreatureBodyPlan;
  readonly size: number;
  readonly signature: "bat-wings" | "claws" | "crystal" | "fangs" | "jaws" | "mushroom-cap" | "roots" | "shell" | "shield" | "skull" | "tentacles" | "wings";
  readonly tags: readonly string[];
}

export interface CreatureAffinity {
  readonly id: CreatureAffinityId;
  readonly label: string;
  readonly primary: number;
  readonly secondary: number;
  readonly glow: number;
  readonly signaturePart: string;
  readonly tags: readonly string[];
}

export interface CreatureResourceDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: "creature";
  readonly archetypeId: string;
  readonly affinityId: CreatureAffinityId;
  readonly tags: readonly string[];
  readonly signatureParts: readonly string[];
  readonly create: () => THREE.Group;
}
