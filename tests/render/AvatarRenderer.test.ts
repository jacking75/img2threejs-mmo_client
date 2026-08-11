import { Group, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "../../src/domain/character";
import { AvatarRenderer } from "../../src/render/AvatarRenderer";

describe("AvatarRenderer", () => {
  it("renders the equipped outfit and animates named pivots", () => {
    const parent = new Group();
    const baseProfile = createDefaultProfile({ name: "별빛", body: "feminine", classId: "warrior" });
    const profile = {
      ...baseProfile,
      equipped: { ...baseProfile.equipped, outfit: "outfit.traveler" },
    };
    const renderer = new AvatarRenderer(parent, profile);
    const leftArm = renderer.avatar.getObjectByName("arm.L.upper");

    expect(parent.children).toContain(renderer.avatar);
    expect(renderer.avatar.getObjectByName("outfit.traveler.coat")).toBeDefined();
    renderer.face(new Vector3(1, 0, 0), 1);
    renderer.update(0.1, 0.2, "run");
    expect(renderer.avatar.rotation.y).toBeCloseTo(Math.PI / 2, 3);
    expect(leftArm?.rotation.x).not.toBe(0);

    renderer.dispose();
    expect(parent.children).not.toContain(renderer.avatar);
  });
});
