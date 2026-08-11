export type LocomotionState = "idle" | "run" | "sprint";

export function selectLocomotionState(isMoving: boolean, sprintHeld: boolean): LocomotionState {
  if (!isMoving) return "idle";
  return sprintHeld ? "sprint" : "run";
}
