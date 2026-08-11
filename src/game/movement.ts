import * as THREE from "three";
import type { MovementInputSnapshot } from "./input";

export const WALK_SPEED = 4.2;
export const SPRINT_SPEED = 7.1;

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export function getCameraRelativeMovement(
  input: MovementInputSnapshot,
  cameraForward: THREE.Vector3,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const forward = cameraForward.clone();
  forward.y = 0;
  if (forward.lengthSq() < 0.000001) forward.set(0, 0, 1);
  else forward.normalize();

  const right = forward.clone().cross(WORLD_UP).normalize();
  target.copy(forward).multiplyScalar(input.forward).addScaledVector(right, input.right);
  if (target.lengthSq() > 1) target.normalize();
  return target;
}

export function getMovementSpeed(sprint: boolean): number {
  return sprint ? SPRINT_SPEED : WALK_SPEED;
}
