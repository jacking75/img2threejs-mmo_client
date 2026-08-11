import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { FIELD_SIZE, createField } from "../../src/render/createField";

describe("createField", () => {
  it("builds the documented field, atmosphere, props, and player root", () => {
    const field = createField();
    const ground = field.scene.getObjectByName("field.ground") as THREE.Mesh | undefined;

    expect(field.scene.userData.fieldSize).toBe(FIELD_SIZE);
    expect(FIELD_SIZE).toBe(240);
    expect(field.scene.fog).toBeInstanceOf(THREE.Fog);
    expect(ground?.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(field.scene.getObjectByName("field.hemisphere-light")).toBeInstanceOf(THREE.HemisphereLight);
    expect(field.scene.getObjectByName("field.sun")).toBeInstanceOf(THREE.DirectionalLight);
    expect(field.scene.getObjectByName("field.player-fill")).toBeInstanceOf(THREE.PointLight);
    expect(field.scene.getObjectByName("player-root")).toBe(field.playerTarget);
    expect(field.scene.getObjectByName("field.sun")?.parent).toBe(field.playerTarget);
    expect(field.scene.getObjectByName("field.sun-target")?.parent).toBe(field.playerTarget);
    expect(field.colliders.some(({ type }) => type === "circle")).toBe(true);
    expect(field.colliders.some(({ type }) => type === "aabb")).toBe(true);
    expect(field.colliders.some((collider) => {
      const x = collider.type === "circle" ? collider.x : (collider.minX + collider.maxX) / 2;
      const z = collider.type === "circle" ? collider.z : (collider.minZ + collider.maxZ) / 2;
      return Math.hypot(x, z) > 80;
    })).toBe(true);
    expect(field.scene.getObjectByName("field.fantasy-tree.1")).toBeDefined();
    expect(field.scene.getObjectByName("field.rock-cluster.1")).toBeDefined();
    expect(field.scene.getObjectByName("field.waystone.1")).toBeDefined();

    field.dispose();
  });
});
