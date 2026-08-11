import { describe, expect, it } from "vitest";
import { CLASS_CATALOG, ITEM_CATALOG } from "../../src/domain/catalog";
import { createDefaultProfile, validateCharacterName } from "../../src/domain/character";
import { equipOwnedItem } from "../../src/domain/equipment";

describe("character profile", () => {
  it.each([
    ["warrior", "outfit.warrior-starter"],
    ["mage", "outfit.mage-starter"],
    ["ranger", "outfit.ranger-starter"],
  ] as const)("derives the documented %s starting equipment", (classId, outfitId) => {
    const profile = createDefaultProfile({ name: "별빛", body: "feminine", classId });

    expect(profile.equipped).toEqual({
      weapon: "weapon.training-sword",
      outfit: outfitId,
      head: "head.none",
    });
    expect(profile.ownedItemIds).toEqual(expect.arrayContaining([
      "weapon.training-sword",
      "weapon.moon-sword",
      outfitId,
      "outfit.traveler",
      "head.none",
      "head.starter-cap",
    ]));
  });

  it("normalizes a valid name and rejects names outside the 2-16 character range", () => {
    expect(validateCharacterName("  루나  ")).toEqual({ valid: true, name: "루나" });
    expect(validateCharacterName("별")).toEqual({ valid: false, reason: "too-short" });
    expect(validateCharacterName("12345678901234567")).toEqual({ valid: false, reason: "too-long" });
  });

  it("keeps preview-only staff, bow, and quiver out of the game catalog", () => {
    expect(ITEM_CATALOG).not.toHaveProperty("weapon.mage-staff");
    expect(ITEM_CATALOG).not.toHaveProperty("weapon.ranger-bow");
    expect(ITEM_CATALOG).not.toHaveProperty("equipment.quiver");
    expect(Object.keys(CLASS_CATALOG)).toEqual(["warrior", "mage", "ranger"]);
  });
});

describe("equipOwnedItem", () => {
  it("rejects an item the character does not own", () => {
    const profile = createDefaultProfile({ name: "루나", body: "feminine", classId: "mage" });
    const result = equipOwnedItem(profile, "outfit.warrior-starter");

    expect(result).toEqual({ ok: false, profile, reason: "item-not-owned" });
  });

  it("changes only the weapon slot when equipping a sword", () => {
    const profile = createDefaultProfile({ name: "카인", body: "masculine", classId: "warrior" });
    const result = equipOwnedItem(profile, "weapon.moon-sword");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.equipped).toEqual({
      weapon: "weapon.moon-sword",
      outfit: "outfit.warrior-starter",
      head: "head.none",
    });
    expect(profile.equipped.weapon).toBe("weapon.training-sword");
  });

  it("changes only the matching outfit or head slot", () => {
    const profile = createDefaultProfile({ name: "세라", body: "feminine", classId: "ranger" });
    const outfitResult = equipOwnedItem(profile, "outfit.traveler");
    expect(outfitResult.ok).toBe(true);
    if (!outfitResult.ok) return;
    expect(outfitResult.profile.equipped).toEqual({
      weapon: "weapon.training-sword",
      outfit: "outfit.traveler",
      head: "head.none",
    });

    const headResult = equipOwnedItem(outfitResult.profile, "head.starter-cap");
    expect(headResult.ok).toBe(true);
    if (!headResult.ok) return;
    expect(headResult.profile.equipped.head).toBe("head.starter-cap");
    expect(headResult.profile.equipped.outfit).toBe("outfit.traveler");
  });

  it("rejects an unknown item id", () => {
    const profile = createDefaultProfile({ name: "루나", body: "feminine", classId: "mage" });
    expect(equipOwnedItem(profile, "weapon.unknown")).toEqual({
      ok: false,
      profile,
      reason: "unknown-item",
    });
  });
});
