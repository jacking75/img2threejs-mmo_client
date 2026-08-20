import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { FAUNA_RESOURCE_CATALOG, FAUNA_SPECIES, FAUNA_VARIANTS, disposeFaunaResource } from "../../src/assets/fauna";

function firstMesh(root: THREE.Object3D): THREE.Mesh {
  let result: THREE.Mesh | undefined;
  root.traverse((node) => {
    if (!result && node instanceof THREE.Mesh) result = node;
  });
  if (!result) throw new Error("Fauna resource has no mesh");
  return result;
}

describe("fauna procedural resource suite", () => {
  it("provides 52 species across four silhouette variants for 208 animals", () => {
    expect(FAUNA_SPECIES).toHaveLength(52);
    expect(FAUNA_VARIANTS).toHaveLength(4);
    expect(FAUNA_RESOURCE_CATALOG).toHaveLength(208);
    expect(new Set(FAUNA_RESOURCE_CATALOG.map(({ id }) => id)).size).toBe(208);
    expect(new Set(FAUNA_SPECIES.map(({ id }) => id)).size).toBe(52);
  });

  it("creates every animal with finite volume, named parts, sockets, metadata, and variant silhouette", () => {
    for (const definition of FAUNA_RESOURCE_CATALOG) {
      const animal = definition.create();
      const bounds = new THREE.Box3().setFromObject(animal);
      const size = bounds.getSize(new THREE.Vector3());
      expect(animal.name).toBe(definition.id);
      expect(bounds.isEmpty(), definition.id).toBe(false);
      expect(size.toArray().every(Number.isFinite), definition.id).toBe(true);
      expect(size.length(), definition.id).toBeGreaterThan(0.3);
      expect(size.x, definition.id).toBeGreaterThan(0.08);
      expect(size.y, definition.id).toBeGreaterThan(0.08);
      expect(size.z, definition.id).toBeGreaterThan(0.08);
      expect(Object.keys(animal.userData.sculptRuntime.sockets).sort()).toEqual(["head", "mouth", "saddle"]);
      expect(animal.userData.resource).toMatchObject({ type: "fauna", original: true, procedural: true, quality: "runtime-gallery" });
      for (const part of definition.signatureParts) expect(animal.getObjectByName(part), `${definition.id}: ${part}`).toBeDefined();
      animal.traverse((node) => {
        expect(node.name.length, definition.id).toBeGreaterThan(0);
        expect(node.userData).toMatchObject({ original: true, procedural: true, provenance: "project-original-procedural", resourceType: "fauna", resourceId: definition.id });
      });
      disposeFaunaResource(animal);
      expect(animal.userData.disposed).toBe(true);
    }
  });

  it("isolates geometry and materials between repeated factory calls", () => {
    const definition = FAUNA_RESOURCE_CATALOG[0];
    if (!definition) throw new Error("Fauna catalog unexpectedly empty");
    const first = definition.create();
    const second = definition.create();
    const firstPart = firstMesh(first);
    const secondPart = firstMesh(second);
    expect(firstPart.geometry).not.toBe(secondPart.geometry);
    expect(firstPart.material).not.toBe(secondPart.material);
    disposeFaunaResource(first);
    disposeFaunaResource(second);
  });
});
