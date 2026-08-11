import * as THREE from "three";
import { mesh } from "../geometry";
import { standard, toon } from "../materials";

export function createFantasyTree(): THREE.Group {
  const root = new THREE.Group();
  root.name = "field.fantasy-tree";
  const bark = standard(0x5a412d, 0.9);
  const leafColors = [0x4d7044, 0x64834e, 0x78975d];
  root.add(mesh("tree.trunk", new THREE.CylinderGeometry(0.28, 0.42, 2.8, 7), bark, [0, 1.4, 0]));
  const branches = [
    [-0.55, 2.15, 0.05, -0.7],
    [0.56, 2.36, -0.04, 0.72],
    [0.12, 2.65, -0.22, 0.18],
  ] as const;
  branches.forEach(([x, y, z, angle], index) => {
    const branch = mesh(`tree.branch.${index + 1}`, new THREE.CylinderGeometry(0.1, 0.17, 1.2, 7), bark, [x, y, z]);
    branch.rotation.z = angle;
    root.add(branch);
  });
  const crowns = [
    [-0.78, 3.05, 0.02, 0.95],
    [0.78, 3.12, -0.08, 1.0],
    [0, 3.55, 0, 1.2],
    [0.05, 2.88, 0.3, 0.9],
  ] as const;
  crowns.forEach(([x, y, z, scale], index) => root.add(mesh(`tree.crown.${index + 1}`, new THREE.IcosahedronGeometry(0.9, 1), toon(leafColors[index % leafColors.length] ?? leafColors[0]), [x, y, z], [scale, scale * 0.76, scale])));
  return root;
}

export function createRockCluster(): THREE.Group {
  const root = new THREE.Group();
  root.name = "field.rock-cluster";
  const colors = [0x64716e, 0x78827c, 0x53615f];
  const rocks = [
    [-0.35, 0.3, 0, 0.72, 0.55, 0.62],
    [0.32, 0.22, 0.08, 0.55, 0.42, 0.48],
    [0.05, 0.12, 0.45, 0.38, 0.3, 0.4],
  ] as const;
  rocks.forEach(([x, y, z, sx, sy, sz], index) => root.add(mesh(`rock.${index + 1}`, new THREE.DodecahedronGeometry(0.62, 0), standard(colors[index] ?? colors[0], 0.94), [x, y, z], [sx, sy, sz])));
  return root;
}

export function createGrassTuft(): THREE.Group {
  const root = new THREE.Group();
  root.name = "field.grass-tuft";
  const grass = toon(0x6f8a52);
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const blade = mesh(`grass.blade.${index + 1}`, new THREE.ConeGeometry(0.065, 0.68 + (index % 3) * 0.08, 4), grass, [Math.cos(angle) * 0.12, 0.32, Math.sin(angle) * 0.12]);
    blade.rotation.z = Math.cos(angle) * 0.22;
    blade.rotation.x = Math.sin(angle) * 0.22;
    root.add(blade);
  }
  return root;
}

export function createWaystone(): THREE.Group {
  const root = new THREE.Group();
  root.name = "field.waystone";
  const stone = standard(0x697876, 0.92);
  const rune = new THREE.MeshStandardMaterial({ color: 0x8fd6dd, emissive: 0x315f68, emissiveIntensity: 0.85, roughness: 0.42 });
  root.add(mesh("waystone.body", new THREE.CylinderGeometry(0.43, 0.56, 1.85, 6), stone, [0, 0.92, 0]));
  const ring = mesh("waystone.rune", new THREE.TorusGeometry(0.2, 0.025, 5, 16), rune, [0, 1.1, 0.39]);
  root.add(ring);
  root.add(mesh("waystone.rune.dot", new THREE.SphereGeometry(0.045, 8, 6), rune, [0, 1.1, 0.43]));
  return root;
}
