import { describe, expect, it } from "vitest";
import { selectLocomotionState } from "../../src/game/animationState";

describe("selectLocomotionState", () => {
  it("keeps idle when sprint is held without movement", () => {
    expect(selectLocomotionState(false, true)).toBe("idle");
  });

  it("selects run and sprint only while moving", () => {
    expect(selectLocomotionState(true, false)).toBe("run");
    expect(selectLocomotionState(true, true)).toBe("sprint");
  });
});
