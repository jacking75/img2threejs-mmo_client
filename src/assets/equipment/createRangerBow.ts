import * as THREE from "three";
import { mesh } from "../geometry";
import { standard } from "../materials";

class BowCurve extends THREE.Curve<THREE.Vector3> {
  public constructor(private readonly side: -1 | 1) {
    super();
  }

  public override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const y = (t - 0.5) * 2.45;
    const bend = Math.sin(t * Math.PI) * 0.42 * this.side;
    return target.set(bend, y, 0);
  }
}

/** 원점은 그립 중앙이며 +Y가 위쪽 림, +Z가 활의 앞면 방향이다. */
export function createRangerBow(): THREE.Group {
  const group = new THREE.Group();
  group.name = "weapon.ranger-bow";
  const wood = standard(0x70482a, 0.72);
  const leather = standard(0x3e2c22, 0.88);
  const stringMaterial = standard(0xd8cfb6, 0.9);

  group.add(mesh("bow.limb.left", new THREE.TubeGeometry(new BowCurve(-1), 18, 0.035, 6, false), wood));
  group.add(mesh("bow.limb.right", new THREE.TubeGeometry(new BowCurve(1), 18, 0.035, 6, false), wood));
  group.add(mesh("bow.grip", new THREE.CylinderGeometry(0.065, 0.065, 0.38, 8), leather));
  const stringCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.22, 0),
    new THREE.Vector3(0, 0, -0.12),
    new THREE.Vector3(0, 1.22, 0),
  ]);
  group.add(mesh("bow.string", new THREE.TubeGeometry(stringCurve, 2, 0.009, 4, false), stringMaterial));
  return group;
}
