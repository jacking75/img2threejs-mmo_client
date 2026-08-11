import * as THREE from "three";
import { mesh } from "../geometry";
import { COMMON_COLORS, standard, toon } from "../materials";

/** 머리 소켓 원점을 얼굴 중심으로 보고 +Y 위쪽, +Z 얼굴 앞쪽으로 사용한다. */
export function createStarterCap(): THREE.Group {
  const group = new THREE.Group();
  group.name = "head.starter-cap";
  const cloth = toon(0x496f7a);
  const trim = standard(COMMON_COLORS.leatherLight, 0.78);

  group.add(mesh(
    "head.starter-cap.crown",
    new THREE.SphereGeometry(0.53, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.52),
    cloth,
    [0, 0.44, 0],
    [1.04, 0.68, 1.02],
  ));
  const band = mesh(
    "head.starter-cap.band",
    new THREE.TorusGeometry(0.49, 0.045, 6, 18),
    trim,
    [0, 0.42, 0],
    [1, 1, 0.92],
  );
  band.rotation.x = Math.PI / 2;
  group.add(band);
  const brim = mesh(
    "head.starter-cap.brim",
    new THREE.SphereGeometry(0.34, 12, 7, 0, Math.PI),
    cloth,
    [0, 0.38, 0.38],
    [1.15, 0.16, 0.72],
  );
  brim.rotation.x = Math.PI / 2;
  group.add(brim);
  return group;
}
