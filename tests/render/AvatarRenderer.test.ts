import { Box3, Group, Vector3 } from "three";
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

    const rightArm = renderer.avatar.getObjectByName("arm.R.upper");
    const runRotation = rightArm?.rotation.z ?? 0;
    renderer.update(0.1, 0.3, "attack_1", 0.5);
    expect(rightArm?.rotation.z).not.toBe(runRotation);
    expect(parent.getObjectByName("attack_1.sword-arc")?.parent?.visible).toBe(true);

    renderer.dispose();
    expect(parent.children).not.toContain(renderer.avatar);
  });

  it("scales only the field avatar to a human-sized world footprint", () => {
    const parent = new Group();
    const profile = createDefaultProfile({ name: "시야", body: "masculine", classId: "ranger" });
    const renderer = new AvatarRenderer(parent, profile, { visualScale: 0.36 });
    const height = new Box3().setFromObject(renderer.avatar).getSize(new Vector3()).y;

    expect(renderer.avatar.scale.toArray()).toEqual([0.36, 0.36, 0.36]);
    expect(height).toBeGreaterThan(1.7);
    expect(height).toBeLessThan(2.4);

    renderer.dispose();
  });
});
