import * as THREE from "three";
import { COMMON_COLORS, metal, standard } from "../materials";
import { extrudedShape, mesh } from "../geometry";

export type SwordStyle = "training" | "moon";

/**
 * 독립 무기 좌표계 계약이다.
 * 원점은 그립 중앙이며 +Y가 칼끝 방향, +Z가 칼날 앞면 방향이다.
 */
export function createSword(style: SwordStyle): THREE.Group {
  const group = new THREE.Group();
  group.name = style === "training" ? "weapon.training-sword" : "weapon.moon-sword";

  const isMoon = style === "moon";
  const bladeMaterial = metal(isMoon ? 0xa9bfd7 : COMMON_COLORS.metal);
  const guardMaterial = metal(isMoon ? 0xc9a85e : COMMON_COLORS.metalDark);
  const leather = standard(isMoon ? 0x34304f : COMMON_COLORS.leather, 0.76);

  const blade = extrudedShape(
    "blade",
    isMoon
      ? [[-0.12, 0.32], [-0.15, 1.52], [-0.08, 1.91], [0, 2.1], [0.12, 1.66], [0.11, 0.32]]
      : [[-0.1, 0.32], [-0.12, 1.75], [0, 2.08], [0.12, 1.75], [0.1, 0.32]],
    0.075,
    bladeMaterial,
    0.018,
  );
  group.add(blade);

  const fuller = mesh(
    "blade.fuller",
    new THREE.BoxGeometry(0.035, 1.28, 0.012),
    metal(isMoon ? 0x7d91ad : 0x85939b),
    [0, 1.04, 0.046],
  );
  fuller.userData.explodeWithParent = true;
  group.add(fuller);

  const guard = mesh(
    "guard",
    new THREE.CapsuleGeometry(0.075, isMoon ? 0.5 : 0.42, 4, 8),
    guardMaterial,
    [0, 0.28, 0],
  );
  guard.rotation.z = Math.PI / 2;
  group.add(guard);

  const grip = mesh("grip", new THREE.CylinderGeometry(0.075, 0.085, 0.52, 8), leather, [0, 0, 0]);
  group.add(grip);
  for (let index = 0; index < 5; index += 1) {
    const wrap = mesh(
      `grip.wrap.${index + 1}`,
      new THREE.TorusGeometry(0.079, 0.009, 4, 12),
      standard(isMoon ? 0x6c5a94 : COMMON_COLORS.leatherLight, 0.72),
      [0, -0.19 + index * 0.095, 0],
    );
    wrap.rotation.x = Math.PI / 2;
    wrap.userData.explodeWithParent = true;
    group.add(wrap);
  }
  const pommel = mesh("pommel", new THREE.SphereGeometry(0.11, 10, 8), guardMaterial, [0, -0.33, 0], [1, 0.8, 0.75]);
  group.add(pommel);
  return group;
}

export const createTrainingSword = (): THREE.Group => createSword("training");
export const createMoonSword = (): THREE.Group => createSword("moon");
