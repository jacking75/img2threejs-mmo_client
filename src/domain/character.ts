import { getStartingEquipment, getStartingOwnedItemIds } from "./catalog";

export const PROFILE_VERSION = 1 as const;
export const BODY_PRESENTATIONS = ["feminine", "masculine"] as const;
export const CHARACTER_CLASSES = ["warrior", "mage", "ranger"] as const;
export const EQUIPMENT_SLOTS = ["weapon", "outfit", "head"] as const;

export type BodyPresentation = (typeof BODY_PRESENTATIONS)[number];
export type CharacterClass = (typeof CHARACTER_CLASSES)[number];
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export interface EquippedItems {
  readonly weapon: string | null;
  readonly outfit: string | null;
  readonly head: string | null;
}

export interface CharacterProfile {
  readonly version: typeof PROFILE_VERSION;
  readonly name: string;
  readonly body: BodyPresentation;
  readonly classId: CharacterClass;
  readonly ownedItemIds: readonly string[];
  readonly equipped: EquippedItems;
}

export interface CharacterCreationInput {
  readonly name: string;
  readonly body: BodyPresentation;
  readonly classId: CharacterClass;
}

export type NameValidationResult =
  | { readonly valid: true; readonly name: string }
  | { readonly valid: false; readonly reason: "too-short" | "too-long" };

export function validateCharacterName(value: string): NameValidationResult {
  const name = value.trim();
  const length = Array.from(name).length;
  if (length < 2) return { valid: false, reason: "too-short" };
  if (length > 16) return { valid: false, reason: "too-long" };
  return { valid: true, name };
}

export function createDefaultProfile(input: CharacterCreationInput): CharacterProfile {
  const nameResult = validateCharacterName(input.name);
  if (!nameResult.valid) throw new RangeError(`Invalid character name: ${nameResult.reason}`);

  return {
    version: PROFILE_VERSION,
    name: nameResult.name,
    body: input.body,
    classId: input.classId,
    ownedItemIds: getStartingOwnedItemIds(input.classId),
    equipped: getStartingEquipment(input.classId),
  };
}
