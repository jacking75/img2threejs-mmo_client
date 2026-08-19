import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  disposePlayerItemResource,
  playerAccessoryResources,
  playerHeadResources,
  playerItemResources,
  playerOutfitResources,
  playerWeaponResources,
} from "../../src/assets/player-items";

function expectFiniteNonEmptyBounds(root: THREE.Object3D): void {
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  expect(bounds.isEmpty()).toBe(false);
  expect(size.toArray().every(Number.isFinite)).toBe(true);
  expect(size.length()).toBeGreaterThan(0.2);
}

describe("player item resource catalog", () => {
  it("provides 168 differentiated MMORPG resources with stable unique ids", () => {
    expect(playerWeaponResources).toHaveLength(72);
    expect(playerOutfitResources).toHaveLength(48);
    expect(playerHeadResources).toHaveLength(24);
    expect(playerAccessoryResources).toHaveLength(24);
    expect(playerItemResources).toHaveLength(168);
    expect(new Set(playerItemResources.map(({ id }) => id)).size).toBe(168);
    expect(new Set(playerItemResources.map(({ label }) => label)).size).toBe(168);
    expect(playerItemResources.every(({ tags }) => tags.length >= 7)).toBe(true);
  });

  it("creates every resource with named procedural parts, metadata, finite bounds, and disposal support", () => {
    for (const definition of playerItemResources) {
      const resource = definition.create();
      expect(resource.name).toBe(definition.id);
      expect(resource.userData.resource).toMatchObject({
        id: definition.id,
        category: definition.category,
        subtype: definition.subtype,
        original: true,
        procedural: true,
        source: "project-original-procedural",
        dispose: "deep-geometry-and-materials",
      });
      expect(resource.userData.attachment).toMatchObject({
        position: [0, 0, 0],
        forwardAxis: "+Z",
        upAxis: "+Y",
      });
      let meshCount = 0;
      resource.traverse((node) => {
        expect(node.name.length).toBeGreaterThan(0);
        expect(node.userData).toMatchObject({
          original: true,
          procedural: true,
          quality: { tier: "runtime-preview", silhouette: "archetype-specific" },
          attachment: { forwardAxis: "+Z", upAxis: "+Y" },
        });
        if (node instanceof THREE.Mesh) {
          meshCount += 1;
          const position = node.geometry.getAttribute("position");
          expect(position.count).toBeGreaterThan(0);
          for (let index = 0; index < position.count; index += 1) {
            expect(Number.isFinite(position.getX(index))).toBe(true);
            expect(Number.isFinite(position.getY(index))).toBe(true);
            expect(Number.isFinite(position.getZ(index))).toBe(true);
          }
        }
      });
      expect(meshCount).toBeGreaterThanOrEqual(2);
      expectFiniteNonEmptyBounds(resource);
      disposePlayerItemResource(resource);
      expect(resource.userData.disposed).toBe(true);
    }
  });

  it("keeps all weapon grips at the origin and documents the shared axis contract", () => {
    for (const definition of playerWeaponResources) {
      const weapon = definition.create();
      expect(weapon.getObjectByName("grip")?.position.toArray()).toEqual([0, 0, 0]);
      expect(weapon.userData.equipmentContract).toEqual({
        gripOrigin: [0, 0, 0],
        bladeAxis: "+Y",
        frontAxis: "+Z",
        socket: "hand.R",
        dispose: "deep-geometry-and-materials",
      });
      expect(weapon.userData.attachment).toMatchObject({ socket: "hand.R", anchorNode: "grip" });
      disposePlayerItemResource(weapon);
    }
  });

  it("publishes the named attachment anchor required by each wearable category", () => {
    for (const definition of playerOutfitResources) {
      const outfit = definition.create();
      expect(outfit.getObjectByName("chest")).toBeDefined();
      expect(outfit.userData.attachment).toMatchObject({ socket: "chest", anchorNode: "chest" });
      disposePlayerItemResource(outfit);
    }
    for (const definition of playerHeadResources) {
      const head = definition.create();
      expect(head.getObjectByName("head")).toBeDefined();
      expect(head.userData.attachment).toMatchObject({ socket: "head", anchorNode: "head" });
      disposePlayerItemResource(head);
    }
    for (const definition of playerAccessoryResources) {
      const accessory = definition.create();
      expect(accessory.getObjectByName(accessory.userData.attachment.anchorNode)).toBeDefined();
      disposePlayerItemResource(accessory);
    }
  });

  it("changes silhouette geometry across every archetype instead of only recoloring clones", () => {
    for (const resources of [playerWeaponResources, playerOutfitResources, playerHeadResources, playerAccessoryResources]) {
      const frontierResources = resources.filter(({ theme }) => theme === "frontier");
      const signatures = frontierResources.map((definition) => {
        const resource = definition.create();
        const size = new THREE.Box3().setFromObject(resource).getSize(new THREE.Vector3());
        let vertexCount = 0;
        resource.traverse((node) => {
          if (node instanceof THREE.Mesh) vertexCount += node.geometry.getAttribute("position").count;
        });
        disposePlayerItemResource(resource);
        return `${size.x.toFixed(3)}:${size.y.toFixed(3)}:${size.z.toFixed(3)}:${vertexCount}`;
      });
      expect(new Set(signatures).size).toBe(frontierResources.length);
    }
  });
});
