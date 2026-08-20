import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CREATURE_AFFINITIES, CREATURE_ARCHETYPES, CREATURE_RESOURCE_CATALOG, disposeCreatureResource } from "../../src/assets/creatures";

describe("monster procedural resource suite", () => {
  it("provides 24 monster archetypes across four affinities for 96 resources", () => {
    expect(CREATURE_ARCHETYPES).toHaveLength(24);
    expect(CREATURE_AFFINITIES).toHaveLength(4);
    expect(CREATURE_RESOURCE_CATALOG).toHaveLength(96);
    expect(new Set(CREATURE_RESOURCE_CATALOG.map(({ id }) => id)).size).toBe(96);
  });

  it("creates every monster as an action-ready named assembly", () => {
    for (const definition of CREATURE_RESOURCE_CATALOG) {
      const creature = definition.create();
      const bounds = new THREE.Box3().setFromObject(creature);
      const size = bounds.getSize(new THREE.Vector3());
      expect(creature.name).toBe(definition.id);
      expect(bounds.isEmpty(), definition.id).toBe(false);
      expect(size.toArray().every(Number.isFinite), definition.id).toBe(true);
      expect(Math.min(size.x, size.y, size.z), definition.id).toBeGreaterThan(0.08);
      expect(Object.keys(creature.userData.sculptRuntime.sockets).sort()).toEqual(["effect", "loot", "target"]);
      expect(creature.userData.resource).toMatchObject({ type: "creature", original: true, procedural: true, quality: "runtime-gallery" });
      for (const part of definition.signatureParts) expect(creature.getObjectByName(part), `${definition.id}: ${part}`).toBeDefined();
      let meshCount = 0;
      creature.traverse((node) => {
        expect(node.name.length, definition.id).toBeGreaterThan(0);
        expect(node.userData.resourceType, `${definition.id}: ${node.name}`).toBe("creature");
        if (node instanceof THREE.Mesh) meshCount += 1;
      });
      expect(meshCount, definition.id).toBeGreaterThanOrEqual(4);
      disposeCreatureResource(creature);
      expect(creature.userData.disposed).toBe(true);
    }
  });
});
