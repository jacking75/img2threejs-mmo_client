import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "../../src/domain/character";
import {
  PROFILE_STORAGE_KEY,
  clearProfile,
  loadProfile,
  restoreProfile,
  saveProfile,
  serializeProfile,
} from "../../src/domain/save";
import type { ProfileStorage } from "../../src/domain/save";

class MemoryStorage implements ProfileStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("profile serialization", () => {
  it("round-trips a valid profile", () => {
    const profile = createDefaultProfile({ name: " 루나 ", body: "feminine", classId: "mage" });
    expect(restoreProfile(serializeProfile(profile))).toEqual(profile);
  });

  it("returns null for malformed JSON", () => {
    expect(restoreProfile("{broken-json")).toBeNull();
  });

  it("returns null for an unsupported version", () => {
    const profile = createDefaultProfile({ name: "카인", body: "masculine", classId: "warrior" });
    expect(restoreProfile(JSON.stringify({ ...profile, version: 2 }))).toBeNull();
  });

  it("rejects equipped items that are missing, unowned, or in the wrong slot", () => {
    const profile = createDefaultProfile({ name: "세라", body: "feminine", classId: "ranger" });
    expect(restoreProfile(JSON.stringify({
      ...profile,
      equipped: { ...profile.equipped, weapon: "outfit.traveler" },
    }))).toBeNull();
    expect(restoreProfile(JSON.stringify({
      ...profile,
      ownedItemIds: profile.ownedItemIds.filter((itemId) => itemId !== "weapon.training-sword"),
    }))).toBeNull();
  });
});

describe("local profile storage", () => {
  it("saves, loads, and clears the profile through one versioned key", () => {
    const storage = new MemoryStorage();
    const profile = createDefaultProfile({ name: "루나", body: "feminine", classId: "mage" });

    expect(saveProfile(profile, storage)).toBe(true);
    expect(storage.getItem(PROFILE_STORAGE_KEY)).not.toBeNull();
    expect(loadProfile(storage)).toEqual(profile);
    expect(clearProfile(storage)).toBe(true);
    expect(loadProfile(storage)).toBeNull();
  });

  it("falls back to character creation for invalid stored data", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILE_STORAGE_KEY, "not-json");
    expect(loadProfile(storage)).toBeNull();
  });
});
