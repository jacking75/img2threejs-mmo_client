import * as THREE from "three";
import {
  createFantasyTree,
  createGrassTuft,
  createRockCluster,
  createWaystone,
} from "../assets/field/createFieldProps";
import type { FieldCollider } from "../game/collision";

export const FIELD_SIZE = 80;

export interface FieldRuntime {
  readonly scene: THREE.Scene;
  readonly playerTarget: THREE.Group;
  readonly colliders: readonly FieldCollider[];
  dispose(): void;
}

type PropFactory = () => THREE.Group;
type PropPlacement = readonly [x: number, z: number, rotation: number, scale?: number];

const TREE_PLACEMENTS: readonly PropPlacement[] = [
  [-28, -25, 0.4, 1.3], [-18, -31, -0.7, 1.05], [-5, -34, 0.2, 1.2],
  [13, -32, 1.1, 1.15], [29, -25, -0.5, 1.25], [33, -8, 0.6, 1.1],
  [31, 14, -0.9, 1.25], [23, 29, 0.3, 1.15], [6, 34, -0.4, 1.3],
  [-13, 32, 0.8, 1.05], [-29, 24, -0.2, 1.2], [-34, 7, 1.2, 1.1],
  [-32, -10, -0.8, 1.3], [19, -18, 0.1, 0.9], [-21, 13, 0.5, 0.95],
];

const ROCK_PLACEMENTS: readonly PropPlacement[] = [
  [-11, -8, 0.2, 1.2], [12, 9, -0.8, 0.9], [20, -12, 1.1, 1.1],
  [-24, -18, -0.4, 1.0], [25, 21, 0.7, 1.25], [-17, 25, 0.1, 0.8],
  [5, -25, -0.5, 0.85], [32, 3, 0.9, 1.0],
];

const WAYSTONE_PLACEMENTS: readonly PropPlacement[] = [
  [0, -18, 0, 1], [18, 0, -Math.PI / 2, 1], [0, 18, Math.PI, 1], [-18, 0, Math.PI / 2, 1],
];

const FIELD_COLLIDERS: readonly FieldCollider[] = [
  ...TREE_PLACEMENTS.map(([x, z, , scale = 1]) => ({
    type: "circle" as const,
    x,
    z,
    radius: 0.78 * scale,
  })),
  ...ROCK_PLACEMENTS.map(([x, z, , scale = 1]) => ({
    type: "aabb" as const,
    minX: x - 0.72 * scale,
    maxX: x + 0.72 * scale,
    minZ: z - 0.66 * scale,
    maxZ: z + 0.66 * scale,
  })),
  ...WAYSTONE_PLACEMENTS.map(([x, z, , scale = 1]) => ({
    type: "circle" as const,
    x,
    z,
    radius: 0.52 * scale,
  })),
];

export function createField(): FieldRuntime {
  const scene = new THREE.Scene();
  scene.name = "field.scene";
  scene.background = new THREE.Color(0xa9d5dc);
  scene.fog = new THREE.Fog(0xa9d5dc, 24, 72);
  scene.userData.fieldSize = FIELD_SIZE;

  const world = new THREE.Group();
  world.name = "field.world";
  scene.add(world);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x78995c, roughness: 0.98, metalness: 0 }),
  );
  ground.name = "field.ground";
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  const clearing = new THREE.Mesh(
    new THREE.CircleGeometry(12, 48),
    new THREE.MeshStandardMaterial({ color: 0x91aa68, roughness: 1 }),
  );
  clearing.name = "field.clearing";
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.y = 0.012;
  clearing.receiveShadow = true;
  world.add(clearing);

  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xbaa67b, roughness: 1 });
  for (const rotation of [0, Math.PI / 2]) {
    const path = new THREE.Mesh(new THREE.PlaneGeometry(5, FIELD_SIZE - 8), pathMaterial);
    path.name = "field.path";
    path.rotation.set(-Math.PI / 2, 0, rotation);
    path.position.y = 0.02;
    path.receiveShadow = true;
    world.add(path);
  }

  addProps(world, createFantasyTree, TREE_PLACEMENTS);
  addProps(world, createRockCluster, ROCK_PLACEMENTS);
  addProps(world, createWaystone, WAYSTONE_PLACEMENTS);
  addGrass(world);

  const playerTarget = new THREE.Group();
  playerTarget.name = "player-root";
  world.add(playerTarget);

  const hemisphere = new THREE.HemisphereLight(0xd9f5ff, 0x53643e, 2.1);
  hemisphere.name = "field.hemisphere-light";
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff0d0, 3.1);
  sun.name = "field.sun";
  sun.position.set(-18, 28, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -32;
  sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32;
  sun.shadow.camera.bottom = -32;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  return {
    scene,
    playerTarget,
    colliders: FIELD_COLLIDERS,
    dispose() {
      disposeObject(scene);
    },
  };
}

function addProps(parent: THREE.Group, factory: PropFactory, placements: readonly PropPlacement[]): void {
  placements.forEach(([x, z, rotation, scale = 1], index) => {
    const prop = factory();
    prop.name = `${prop.name}.${index + 1}`;
    prop.position.set(x, 0, z);
    prop.rotation.y = rotation;
    prop.scale.setScalar(scale);
    setShadows(prop);
    parent.add(prop);
  });
}

function addGrass(parent: THREE.Group): void {
  for (let index = 0; index < 40; index += 1) {
    const angle = index * 2.399963;
    const radius = 8 + (index % 9) * 3.1;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 3.2 || Math.abs(z) < 3.2) continue;
    const grass = createGrassTuft();
    grass.name = `field.grass-tuft.${index + 1}`;
    grass.position.set(x, 0, z);
    grass.rotation.y = angle;
    grass.scale.setScalar(0.72 + (index % 4) * 0.1);
    setShadows(grass);
    parent.add(grass);
  }
}

function setShadows(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}
