import { describe, expect, it } from "vitest";
import { resolvePlayerMovement } from "../../src/game/collision";

describe("resolvePlayerMovement", () => {
  it("clamps the player inside the field boundary", () => {
    const resolved = resolvePlayerMovement({ x: 0, z: 0 }, { x: 99, z: -99 }, 0.5, 40, []);

    expect(resolved).toEqual({ x: 39.5, z: -39.5 });
  });

  it("blocks a circular obstacle", () => {
    const resolved = resolvePlayerMovement(
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      0.5,
      40,
      [{ type: "circle", x: 2, z: 0, radius: 1 }],
    );

    expect(resolved).toEqual({ x: 0, z: 0 });
  });

  it("slides along an AABB when one movement axis remains clear", () => {
    const resolved = resolvePlayerMovement(
      { x: 0, z: 0 },
      { x: 1, z: 1 },
      0.25,
      40,
      [{ type: "aabb", minX: 0.8, maxX: 2, minZ: -0.5, maxZ: 0.5 }],
    );

    expect(resolved).toEqual({ x: 0, z: 1 });
  });
});
