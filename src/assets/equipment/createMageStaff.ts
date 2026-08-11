import * as THREE from "three";
import { mesh } from "../geometry";
import { metal, standard } from "../materials";

/** 원점은 그립 중앙이며 +Y가 지팡이 머리 방향, +Z가 장식의 앞면 방향이다. */
export function createMageStaff(): THREE.Group {
  const group = new THREE.Group();
  group.name = "weapon.mage-staff";
  const wood = standard(0x5b3c2a, 0.82);
  const gold = metal(0xc7a55b);
  const crystal = new THREE.MeshPhysicalMaterial({
    color: 0x8cc8e8,
    emissive: 0x24445f,
    emissiveIntensity: 0.55,
    roughness: 0.18,
    metalness: 0.05,
    clearcoat: 0.75,
  });

  group.add(mesh("staff.shaft", new THREE.CylinderGeometry(0.055, 0.075, 2.6, 8), wood, [0, 0.82, 0]));
  const branches = [
    { x: -0.16, angle: -0.42 },
    { x: 0.16, angle: 0.42 },
  ];
  branches.forEach(({ x, angle }, index) => {
    const branch = mesh(`staff.branch.${index + 1}`, new THREE.CylinderGeometry(0.035, 0.055, 0.62, 7), wood, [x, 2.18, 0]);
    branch.rotation.z = angle;
    group.add(branch);
  });
  group.add(mesh("staff.collar", new THREE.TorusGeometry(0.15, 0.025, 6, 16), gold, [0, 2.18, 0]));
  group.add(mesh("staff.crystal", new THREE.OctahedronGeometry(0.19, 0), crystal, [0, 2.45, 0]));
  return group;
}
