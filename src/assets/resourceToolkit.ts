import * as THREE from "three";

export type Vec3 = readonly [number, number, number];

export function resourceMaterial(color: number, roughness = 0.72, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function resourceGroup(name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  return group;
}

export function resourceMesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: Vec3 = [0, 0, 0],
  scale: Vec3 = [1, 1, 1],
  rotation: Vec3 = [0, 0, 0],
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.position.set(...position);
  result.scale.set(...scale);
  result.rotation.set(...rotation);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

export function resourceSocket(name: string, position: Vec3, parent: THREE.Object3D): THREE.Object3D {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.set(...position);
  socket.userData.socket = true;
  parent.add(socket);
  return socket;
}

export function collectResourceNodes(root: THREE.Object3D): Readonly<Record<string, THREE.Object3D>> {
  const nodes: Record<string, THREE.Object3D> = {};
  root.traverse((node) => {
    if (node.name) nodes[node.name] = node;
  });
  return nodes;
}

export function annotateResourceTree(
  root: THREE.Object3D,
  resourceType: "fauna" | "creature" | "world",
  resourceId: string,
): void {
  root.traverse((node) => {
    node.userData.original = true;
    node.userData.procedural = true;
    node.userData.provenance = "project-original-procedural";
    node.userData.resourceType = resourceType;
    node.userData.resourceId = resourceId;
    if (node instanceof THREE.Mesh) node.userData.clickablePart = true;
  });
}

export function disposeResourceTree(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material.dispose());
  });
  root.userData.disposed = true;
}

export const EMBEDDED_ATTACHMENT = Object.freeze({
  contactType: "embedded",
  embedDepth: 0.08,
  gapTolerance: 0.015,
});
