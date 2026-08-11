export type LocomotionState = "idle" | "run" | "sprint";
export type AnimationState = LocomotionState | "attack_1";

export const ATTACK_DURATION_SECONDS = 0.72;
export const ATTACK_COOLDOWN_SECONDS = 0.28;
export const ATTACK_MOVEMENT_LOCK_SECONDS = 0.16;

export interface AttackTimeline {
  readonly active: boolean;
  readonly elapsedSeconds: number;
  readonly cooldownSeconds: number;
}

export interface AttackStartResult {
  readonly started: boolean;
  readonly timeline: AttackTimeline;
}

export function selectLocomotionState(isMoving: boolean, sprintHeld: boolean): LocomotionState {
  if (!isMoving) return "idle";
  return sprintHeld ? "sprint" : "run";
}

export function selectAnimationState(
  attackActive: boolean,
  isMoving: boolean,
  sprintHeld: boolean,
): AnimationState {
  return attackActive ? "attack_1" : selectLocomotionState(isMoving, sprintHeld);
}

export function createAttackTimeline(): AttackTimeline {
  return { active: false, elapsedSeconds: 0, cooldownSeconds: 0 };
}

export function startAttack(timeline: AttackTimeline): AttackStartResult {
  if (timeline.active || timeline.cooldownSeconds > 0) {
    return { started: false, timeline };
  }
  return {
    started: true,
    timeline: { active: true, elapsedSeconds: 0, cooldownSeconds: 0 },
  };
}

export function advanceAttack(timeline: AttackTimeline, deltaSeconds: number): AttackTimeline {
  const delta = Math.max(deltaSeconds, 0);
  if (!timeline.active) {
    return {
      ...timeline,
      cooldownSeconds: Math.max(0, timeline.cooldownSeconds - delta),
    };
  }

  const elapsedSeconds = timeline.elapsedSeconds + delta;
  if (elapsedSeconds < ATTACK_DURATION_SECONDS) {
    return { ...timeline, elapsedSeconds };
  }

  const overflow = elapsedSeconds - ATTACK_DURATION_SECONDS;
  return {
    active: false,
    elapsedSeconds: ATTACK_DURATION_SECONDS,
    cooldownSeconds: Math.max(0, ATTACK_COOLDOWN_SECONDS - overflow),
  };
}

export function getAttackProgress(timeline: AttackTimeline): number {
  if (!timeline.active) return 0;
  return Math.min(timeline.elapsedSeconds / ATTACK_DURATION_SECONDS, 1);
}

export function isAttackMovementLocked(timeline: AttackTimeline): boolean {
  return timeline.active && timeline.elapsedSeconds < ATTACK_MOVEMENT_LOCK_SECONDS;
}
