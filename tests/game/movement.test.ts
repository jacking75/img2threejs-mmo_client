import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { getCameraRelativeMovement, getMovementSpeed, SPRINT_SPEED, WALK_SPEED } from "../../src/game/movement";

describe("camera-relative movement", () => {
  it("maps forward and right input to the camera plane", () => {
    const cameraForward = new Vector3(0, -0.4, -1);

    const forward = getCameraRelativeMovement({ forward: 1, right: 0, sprint: false }, cameraForward);
    const right = getCameraRelativeMovement({ forward: 0, right: 1, sprint: false }, cameraForward);

    expect(forward.x).toBeCloseTo(0, 5);
    expect(forward.z).toBeCloseTo(-1, 5);
    expect(right.x).toBeCloseTo(1, 5);
    expect(right.z).toBeCloseTo(0, 5);
  });

  it("normalizes diagonal input and selects walk or sprint speed", () => {
    const movement = getCameraRelativeMovement(
      { forward: 1, right: 1, sprint: true },
      new Vector3(0, 0, -1),
    );

    expect(movement.length()).toBeCloseTo(1, 5);
    expect(getMovementSpeed(false)).toBe(WALK_SPEED);
    expect(getMovementSpeed(true)).toBe(SPRINT_SPEED);
    expect(SPRINT_SPEED).toBeGreaterThan(WALK_SPEED);
  });
});
