import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  assetCatalog,
  avatarAssets,
  equipmentAssets,
  fieldAssets,
  legacyEquipmentAssets,
  npcAssets,
  playerItemAssets,
} from "../../src/assets/catalog";
import { createMoonSword, createTrainingSword } from "../../src/assets/equipment/createSword";

describe("equipment factories", () => {
  it.each([createTrainingSword, createMoonSword])("keeps the grip centered at the local origin", (createSword) => {
    const sword = createSword();
    const grip = sword.getObjectByName("grip");
    expect(grip?.position.toArray()).toEqual([0, 0, 0]);
    expect(sword.userData.equipmentContract).toEqual({
      gripOrigin: [0, 0, 0],
      bladeAxis: "+Y",
      frontAxis: "+Z",
      dispose: "deep-geometry-and-materials",
    });

    const size = new Box3().setFromObject(sword).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(2.2);
    expect(size.z).toBeGreaterThan(0.06);
  });
});

describe("asset catalog", () => {
  it("contains every planned preview resource without duplicate ids", () => {
    expect(avatarAssets).toHaveLength(6);
    expect(legacyEquipmentAssets).toHaveLength(5);
    expect(npcAssets).toHaveLength(72);
    expect(playerItemAssets).toHaveLength(168);
    expect(equipmentAssets).toHaveLength(173);
    expect(fieldAssets).toHaveLength(4);
    expect(assetCatalog).toHaveLength(255);
    expect(new Set(assetCatalog.map(({ id }) => id)).size).toBe(assetCatalog.length);
  });
});
