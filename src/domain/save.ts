import { getItemDefinition } from "./catalog";
import {
  BODY_PRESENTATIONS,
  CHARACTER_CLASSES,
  EQUIPMENT_SLOTS,
  PROFILE_VERSION,
  validateCharacterName,
} from "./character";
import type { BodyPresentation, CharacterClass, CharacterProfile, EquippedItems } from "./character";

export const PROFILE_STORAGE_KEY = "anime-field-rpg.profile.v1";

export interface ProfileStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBodyPresentation(value: unknown): value is BodyPresentation {
  return typeof value === "string" && BODY_PRESENTATIONS.some((body) => body === value);
}

function isCharacterClass(value: unknown): value is CharacterClass {
  return typeof value === "string" && CHARACTER_CLASSES.some((classId) => classId === value);
}

function readEquipped(value: unknown, ownedItemIds: readonly string[]): EquippedItems | null {
  if (!isRecord(value)) return null;

  const equipped = {} as Record<(typeof EQUIPMENT_SLOTS)[number], string | null>;
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = value[slot];
    if (itemId === null) {
      equipped[slot] = null;
      continue;
    }
    if (typeof itemId !== "string" || !ownedItemIds.includes(itemId)) return null;
    const item = getItemDefinition(itemId);
    if (!item || item.slot !== slot) return null;
    equipped[slot] = itemId;
  }
  return equipped;
}

export function restoreProfile(serialized: string | null): CharacterProfile | null {
  if (serialized === null) return null;

  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.version !== PROFILE_VERSION) return null;
    if (typeof value.name !== "string" || !isBodyPresentation(value.body) || !isCharacterClass(value.classId)) {
      return null;
    }

    const nameResult = validateCharacterName(value.name);
    if (!nameResult.valid || !Array.isArray(value.ownedItemIds)) return null;
    if (!value.ownedItemIds.every((itemId): itemId is string => typeof itemId === "string" && getItemDefinition(itemId) !== undefined)) {
      return null;
    }
    if (new Set(value.ownedItemIds).size !== value.ownedItemIds.length) return null;

    const equipped = readEquipped(value.equipped, value.ownedItemIds);
    if (!equipped) return null;

    return {
      version: PROFILE_VERSION,
      name: nameResult.name,
      body: value.body,
      classId: value.classId,
      ownedItemIds: [...value.ownedItemIds],
      equipped,
    };
  } catch {
    return null;
  }
}

export function serializeProfile(profile: CharacterProfile): string {
  const serialized = JSON.stringify(profile);
  if (!restoreProfile(serialized)) throw new TypeError("Cannot serialize an invalid character profile");
  return serialized;
}

export function loadProfile(storage: ProfileStorage = window.localStorage): CharacterProfile | null {
  try {
    return restoreProfile(storage.getItem(PROFILE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveProfile(profile: CharacterProfile, storage: ProfileStorage = window.localStorage): boolean {
  try {
    storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(profile));
    return true;
  } catch {
    return false;
  }
}

export function clearProfile(storage: ProfileStorage = window.localStorage): boolean {
  try {
    storage.removeItem(PROFILE_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
