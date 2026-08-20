import type * as THREE from "three";

export type FaunaBodyPlan = "quadruped" | "bird" | "reptile" | "amphibian" | "serpent";
export type FaunaVariantId = "wild" | "highland" | "dusk" | "arcane";
export type FaunaTrait =
  | "antlers"
  | "beak"
  | "bushy-tail"
  | "crest"
  | "flat-tail"
  | "floppy-ears"
  | "hump"
  | "horns"
  | "long-ears"
  | "long-snout"
  | "long-tail"
  | "mane"
  | "shell"
  | "spines"
  | "tusks"
  | "webbed"
  | "whiskers"
  | "wings"
  | "wool";

export interface FaunaSpecies {
  readonly id: string;
  readonly label: string;
  readonly bodyPlan: FaunaBodyPlan;
  readonly size: number;
  readonly body: readonly [number, number, number];
  readonly head: readonly [number, number, number];
  readonly leg: number;
  readonly traits: readonly FaunaTrait[];
  readonly tags: readonly string[];
}

export interface FaunaVariant {
  readonly id: FaunaVariantId;
  readonly label: string;
  readonly primary: number;
  readonly secondary: number;
  readonly accent: number;
  readonly signaturePart: string;
  readonly tags: readonly string[];
}

export interface FaunaResourceDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: "fauna";
  readonly speciesId: string;
  readonly variantId: FaunaVariantId;
  readonly tags: readonly string[];
  readonly signatureParts: readonly string[];
  readonly create: () => THREE.Group;
}
