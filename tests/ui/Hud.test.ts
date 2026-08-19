import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "../../src/domain/character";
import { equipOwnedItem } from "../../src/domain/equipment";
import { buildHudView } from "../../src/ui/Hud";

describe("buildHudView", () => {
  it("derives the character identity and equipped sword label from the profile", () => {
    const profile = createDefaultProfile({
      name: "루나",
      body: "feminine",
      classId: "mage",
    });

    expect(buildHudView(profile)).toEqual({
      characterName: "루나",
      classLabel: "마법사",
      classMark: "마",
      weaponLabel: "장착 검 · 연습용 검",
    });
  });

  it("reflects an equipment transition without owning domain state", () => {
    const profile = createDefaultProfile({
      name: "카인",
      body: "masculine",
      classId: "warrior",
    });
    const result = equipOwnedItem(profile, "weapon.moon-sword");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(buildHudView(result.profile).weaponLabel).toBe("장착 검 · 달빛 검");
    expect(buildHudView(profile).weaponLabel).toBe("장착 검 · 연습용 검");
  });
});
