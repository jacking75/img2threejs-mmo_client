import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { WORLD_PROP_ARCHETYPES, WORLD_PROP_RESOURCE_CATALOG, WORLD_STYLES, disposeWorldPropResource } from "../../src/assets/world-props";

describe("world prop procedural resource suite", () => {
  it("provides 24 archetypes across four regional styles for 96 resources", () => {
    expect(WORLD_PROP_ARCHETYPES).toHaveLength(24);
    expect(WORLD_STYLES).toHaveLength(4);
    expect(WORLD_PROP_RESOURCE_CATALOG).toHaveLength(96);
    expect(new Set(WORLD_PROP_RESOURCE_CATALOG.map(({ id }) => id)).size).toBe(96);
  });

  it("creates every prop with finite 3D form, signature assemblies, interaction sockets, and disposal", () => {
    for (const definition of WORLD_PROP_RESOURCE_CATALOG) {
      const prop = definition.create();
      const bounds = new THREE.Box3().setFromObject(prop);
      const size = bounds.getSize(new THREE.Vector3());
      expect(prop.name).toBe(definition.id);
      expect(bounds.isEmpty(), definition.id).toBe(false);
      expect(size.toArray().every(Number.isFinite), definition.id).toBe(true);
      expect(Math.min(size.x, size.y, size.z), definition.id).toBeGreaterThan(0.03);
      expect(Object.keys(prop.userData.sculptRuntime.sockets).sort()).toEqual(["effect", "ground", "interaction"]);
      expect(prop.userData.resource).toMatchObject({ type: "world", original: true, procedural: true, quality: "runtime-gallery" });
      for (const part of definition.signatureParts) expect(prop.getObjectByName(part), `${definition.id}: ${part}`).toBeDefined();
      prop.traverse((node) => {
        expect(node.name.length, definition.id).toBeGreaterThan(0);
        expect(node.userData.resourceType, `${definition.id}: ${node.name}`).toBe("world");
      });
      disposeWorldPropResource(prop);
      expect(prop.userData.disposed).toBe(true);
    }
  });
});
