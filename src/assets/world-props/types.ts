import type * as THREE from "three";

export type WorldStyleId = "greenward" | "sunreach" | "frostmarch" | "arcane";
export type WorldPropKind = "camp" | "craft" | "furniture" | "mechanism" | "monument" | "structure" | "transport";

export interface WorldPropArchetype {
  readonly id: string;
  readonly label: string;
  readonly kind: WorldPropKind;
  readonly size: number;
  readonly signaturePart: string;
  readonly tags: readonly string[];
}

export interface WorldStyle {
  readonly id: WorldStyleId;
  readonly label: string;
  readonly primary: number;
  readonly secondary: number;
  readonly accent: number;
  readonly ornament: "leaf" | "sun" | "rune" | "crystal";
  readonly signaturePart: string;
  readonly tags: readonly string[];
}

export interface WorldPropResourceDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: "world";
  readonly archetypeId: string;
  readonly styleId: WorldStyleId;
  readonly tags: readonly string[];
  readonly signatureParts: readonly string[];
  readonly create: () => THREE.Group;
}
