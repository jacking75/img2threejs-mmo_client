export interface Point2 {
  readonly x: number;
  readonly z: number;
}

export type FieldCollider =
  | { readonly type: "circle"; readonly x: number; readonly z: number; readonly radius: number }
  | {
      readonly type: "aabb";
      readonly minX: number;
      readonly maxX: number;
      readonly minZ: number;
      readonly maxZ: number;
    };

export function resolvePlayerMovement(
  current: Point2,
  desired: Point2,
  playerRadius: number,
  fieldHalfSize: number,
  colliders: readonly FieldCollider[],
): Point2 {
  const min = -fieldHalfSize + playerRadius;
  const max = fieldHalfSize - playerRadius;
  const bounded = {
    x: clamp(desired.x, min, max),
    z: clamp(desired.z, min, max),
  };

  const xCandidate = { x: bounded.x, z: current.z };
  const x = intersectsAny(xCandidate, playerRadius, colliders) ? current.x : xCandidate.x;
  const zCandidate = { x, z: bounded.z };
  const z = intersectsAny(zCandidate, playerRadius, colliders) ? current.z : zCandidate.z;
  return { x, z };
}

export function intersectsAny(
  point: Point2,
  playerRadius: number,
  colliders: readonly FieldCollider[],
): boolean {
  return colliders.some((collider) => {
    if (collider.type === "circle") {
      const dx = point.x - collider.x;
      const dz = point.z - collider.z;
      const minDistance = playerRadius + collider.radius;
      return dx * dx + dz * dz < minDistance * minDistance;
    }
    return point.x > collider.minX - playerRadius
      && point.x < collider.maxX + playerRadius
      && point.z > collider.minZ - playerRadius
      && point.z < collider.maxZ + playerRadius;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
