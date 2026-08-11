import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "../../src/domain/character";
import { equipOwnedItem } from "../../src/domain/equipment";
import { buildInventorySlotViews } from "../../src/ui/InventoryPanel";

describe("buildInventorySlotViews", () => {
  it("groups catalog items by slot and marks ownership and equipped state", () => {
    const profile = createDefaultProfile({ name: "루나", body: "feminine", classId: "mage" });
    const groups = buildInventorySlotViews(profile);

    expect(groups.map(({ slot }) => slot)).toEqual(["weapon", "outfit", "head"]);
    const weapons = groups.find(({ slot }) => slot === "weapon")?.items ?? [];
    expect(weapons).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "weapon.training-sword", owned: true, equipped: true }),
      expect.objectContaining({ id: "weapon.moon-sword", owned: true, equipped: false }),
    ]));

    const outfits = groups.find(({ slot }) => slot === "outfit")?.items ?? [];
    expect(outfits).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "outfit.mage-starter", owned: true, equipped: true }),
      expect.objectContaining({ id: "outfit.traveler", owned: true, equipped: false }),
      expect.objectContaining({ id: "outfit.warrior-starter", owned: false, equipped: false }),
    ]));
  });

  it("reflects a domain equipment transition without owning the state", () => {
    const profile = createDefaultProfile({ name: "카인", body: "masculine", classId: "warrior" });
    const result = equipOwnedItem(profile, "weapon.moon-sword");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const weapons = buildInventorySlotViews(result.profile)
      .find(({ slot }) => slot === "weapon")?.items ?? [];
    expect(weapons.find(({ id }) => id === "weapon.training-sword")?.equipped).toBe(false);
    expect(weapons.find(({ id }) => id === "weapon.moon-sword")?.equipped).toBe(true);
  });
});
