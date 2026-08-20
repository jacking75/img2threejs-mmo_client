import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assetCatalog, avatarAssets, creatureAssets, faunaAssets, legacyEquipmentAssets, worldPropAssets } from "../../src/assets/catalog";
import { getResourceOwnership, getStablePartKey } from "../../src/dev/resource-editor/resourceManifest";

describe("resource editor manifest", () => {
  it("655개 모든 리소스를 소유 소스와 focused test에 매핑한다", () => {
    expect(assetCatalog).toHaveLength(655);
    for (const definition of assetCatalog) {
      const ownership = getResourceOwnership(definition);
      expect(ownership.sourceFiles.length).toBeGreaterThan(0);
      expect(ownership.focusedTests.length).toBeGreaterThan(0);
      ownership.sourceFiles.forEach((file) => expect(existsSync(file), `${definition.id}: ${file}`).toBe(true));
      ownership.focusedTests.forEach((file) => expect(existsSync(file), `${definition.id}: ${file}`).toBe(true));
    }
  });

  it("대표 5종과 명시 partKey를 안정적으로 해석한다", () => {
    const representatives = [avatarAssets[0], faunaAssets[0], creatureAssets[0], worldPropAssets[0], legacyEquipmentAssets[0]];
    representatives.forEach((definition) => {
      expect(definition).toBeDefined();
      if (definition) expect(getResourceOwnership(definition).sourceFiles.length).toBeGreaterThan(0);
    });
    expect(getStablePartKey(["root", "head", "ear.L"], "ear.left")).toBe("ear.left");
    expect(getStablePartKey(["root", "head", "ear.L"])).toBe("root/head/ear.L");
  });
});
