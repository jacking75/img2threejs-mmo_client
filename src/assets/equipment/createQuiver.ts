import * as THREE from "three";
import { mesh } from "../geometry";
import { metal, standard } from "../materials";

export function createQuiver(): THREE.Group {
  const group = new THREE.Group();
  group.name = "equipment.quiver";
  const leather = standard(0x68472f, 0.82);
  const shaft = standard(0x8b623d, 0.78);
  group.add(mesh("quiver.case", new THREE.CylinderGeometry(0.18, 0.13, 1.15, 10, 1, true), leather));
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const arrow = mesh(
      `quiver.arrow.${index + 1}`,
      new THREE.CylinderGeometry(0.012, 0.012, 1.2, 5),
      shaft,
      [Math.cos(angle) * 0.09, 0.5, Math.sin(angle) * 0.09],
    );
    group.add(arrow);
    group.add(mesh(`quiver.tip.${index + 1}`, new THREE.ConeGeometry(0.045, 0.13, 4), metal(0x66747c), [arrow.position.x, 1.14, arrow.position.z]));
  }
  return group;
}
