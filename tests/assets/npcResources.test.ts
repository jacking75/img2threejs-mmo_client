import { Box3, Mesh, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { NPC_ARCHETYPES, NPC_FACTIONS, NPC_RESOURCE_CATALOG } from "../../src/assets/npc/catalog";
import { disposeNpcResource } from "../../src/assets/npc/createNpcResource";

function firstMesh(root: { traverse(callback: (node: unknown) => void): void }): Mesh {
  let found: Mesh | undefined;
  root.traverse((node) => {
    if (!found && node instanceof Mesh) found = node;
  });
  if (!found) throw new Error("Expected a procedural NPC mesh");
  return found;
}

describe("NPC procedural resource suite", () => {
  it("provides 24 archetypes across three factions for 72 resources", () => {
    expect(NPC_ARCHETYPES).toHaveLength(24);
    expect(NPC_FACTIONS).toHaveLength(3);
    expect(NPC_RESOURCE_CATALOG).toHaveLength(72);
    expect(new Set(NPC_RESOURCE_CATALOG.map(({ id }) => id)).size).toBe(72);
    expect(new Set(NPC_ARCHETYPES.map(({ id }) => id)).size).toBe(24);
  });

  it("creates every resource with finite bounds, stable sockets, metadata, and signature parts", () => {
    for (const definition of NPC_RESOURCE_CATALOG) {
      const npc = definition.create();
      const runtime = npc.userData.sculptRuntime;
      const bounds = new Box3().setFromObject(npc);
      const size = bounds.getSize(new Vector3());

      expect(npc.name).toBe(definition.id);
      expect(bounds.isEmpty(), definition.id).toBe(false);
      expect([size.x, size.y, size.z].every(Number.isFinite), definition.id).toBe(true);
      expect(size.x, definition.id).toBeGreaterThan(0.5);
      expect(size.y, definition.id).toBeGreaterThan(3.5);
      expect(size.y, definition.id).toBeLessThan(8);
      expect(Object.keys(runtime.sockets).sort(), definition.id).toEqual(["back", "hand.L", "hand.R", "head"]);
      expect(npc.userData.npcResource.provenance).toBe("original-procedural");
      expect(npc.userData.npcResource.quality).toBe("gallery-ready");
      expect(npc.userData.npcResource.socketContract).toEqual(["hand.R", "hand.L", "head", "back"]);
      expect(npc.getObjectByName(`npc.faction.${definition.factionId}.mantle`), definition.id).toBeDefined();
      expect(npc.getObjectByName(`npc.faction.${definition.factionId}.${NPC_FACTIONS.find(({ id }) => id === definition.factionId)?.motif}-badge`), definition.id).toBeDefined();
      for (const partName of definition.signatureParts) {
        expect(npc.getObjectByName(partName), `${definition.id}: ${partName}`).toBeDefined();
      }

      npc.traverse((node) => {
        expect(node.name, definition.id).not.toBe("");
        expect(node.userData.provenance, `${definition.id}: ${node.name}`).toBe("original-procedural");
        expect(node.userData.npcArchetype, `${definition.id}: ${node.name}`).toBe(definition.archetypeId);
        expect(node.userData.npcFaction, `${definition.id}: ${node.name}`).toBe(definition.factionId);
      });
      disposeNpcResource(npc);
      expect(npc.userData.disposed).toBe(true);
    }
  });

  it("creates isolated geometry and materials and disposes one instance without touching another", () => {
    const definition = NPC_RESOURCE_CATALOG[0];
    if (!definition) throw new Error("NPC catalog unexpectedly empty");
    const first = definition.create();
    const second = definition.create();
    const firstPart = firstMesh(first);
    const secondPart = firstMesh(second);
    let secondGeometryDisposed = false;
    let secondMaterialDisposed = false;
    const secondMaterial = Array.isArray(secondPart.material) ? secondPart.material[0] : secondPart.material;
    if (!secondMaterial) throw new Error("NPC mesh unexpectedly lacks a material");
    secondPart.geometry.addEventListener("dispose", () => { secondGeometryDisposed = true; });
    secondMaterial.addEventListener("dispose", () => { secondMaterialDisposed = true; });

    expect(firstPart.geometry).not.toBe(secondPart.geometry);
    expect(firstPart.material).not.toBe(secondPart.material);
    disposeNpcResource(first);
    expect(secondGeometryDisposed).toBe(false);
    expect(secondMaterialDisposed).toBe(false);
    disposeNpcResource(second);
    expect(secondGeometryDisposed).toBe(true);
    expect(secondMaterialDisposed).toBe(true);
  });
});
