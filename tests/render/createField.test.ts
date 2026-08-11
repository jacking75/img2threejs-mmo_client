import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { FIELD_SIZE, createField } from "../../src/render/createField";

describe("createField", () => {
  it("builds the documented field, atmosphere, props, and player root", () => {
    const field = createField();
    const ground = field.scene.getObjectByName("field.ground") as THREE.Mesh | undefined;

    expect(field.scene.userData.fieldSize).toBe(FIELD_SIZE);
    expect(FIELD_SIZE).toBe(80);
    expect(field.scene.fog).toBeInstanceOf(THREE.Fog);
    expect(ground?.geometry).toBeInstanceOf(THREE.PlaneGeometry);
    expect(field.scene.getObjectByName("field.hemisphere-light")).toBeInstanceOf(THREE.HemisphereLight);
    expect(field.scene.getObjectByName("field.sun")).toBeInstanceOf(THREE.DirectionalLight);
    expect(field.scene.getObjectByName("player-root")).toBe(field.playerTarget);
    expect(field.playerTarget.children).toHaveLength(0);
    expect(field.colliders.some(({ type }) => type === "circle")).toBe(true);
    expect(field.colliders.some(({ type }) => type === "aabb")).toBe(true);
    expect(field.scene.getObjectByName("field.fantasy-tree.1")).toBeDefined();
    expect(field.scene.getObjectByName("field.rock-cluster.1")).toBeDefined();
    expect(field.scene.getObjectByName("field.waystone.1")).toBeDefined();

    field.dispose();
  });
});
