import { describe, expect, it } from "vitest";
import {
  ATTACK_COOLDOWN_SECONDS,
  ATTACK_DURATION_SECONDS,
  advanceAttack,
  createAttackTimeline,
  getAttackProgress,
  isAttackMovementLocked,
  selectAnimationState,
  selectLocomotionState,
  startAttack,
} from "../../src/game/animationState";

describe("selectLocomotionState", () => {
  it("keeps idle when sprint is held without movement", () => {
    expect(selectLocomotionState(false, true)).toBe("idle");
  });

  it("selects run and sprint only while moving", () => {
    expect(selectLocomotionState(true, false)).toBe("run");
    expect(selectLocomotionState(true, true)).toBe("sprint");
  });
});

describe("attack_1 timeline", () => {
  it("prioritizes attack over run and sprint until the delta-time timeline ends", () => {
    const started = startAttack(createAttackTimeline());
    expect(started.started).toBe(true);
    expect(selectAnimationState(started.timeline.active, true, true)).toBe("attack_1");

    const active = advanceAttack(started.timeline, ATTACK_DURATION_SECONDS - 0.01);
    expect(active.active).toBe(true);
    expect(getAttackProgress(active)).toBeGreaterThan(0.9);
    expect(selectAnimationState(active.active, true, false)).toBe("attack_1");

    const finished = advanceAttack(active, 0.02);
    expect(finished.active).toBe(false);
    expect(selectAnimationState(finished.active, true, false)).toBe("run");
    expect(selectAnimationState(finished.active, true, true)).toBe("sprint");
  });

  it("locks only the opening movement window and enforces cooldown", () => {
    const started = startAttack(createAttackTimeline()).timeline;
    expect(isAttackMovementLocked(started)).toBe(true);
    expect(isAttackMovementLocked(advanceAttack(started, 0.17))).toBe(false);

    const finished = advanceAttack(started, ATTACK_DURATION_SECONDS);
    expect(startAttack(finished).started).toBe(false);
    const cooled = advanceAttack(finished, ATTACK_COOLDOWN_SECONDS);
    expect(startAttack(cooled).started).toBe(true);
  });
});
