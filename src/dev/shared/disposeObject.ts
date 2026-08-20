import * as THREE from "three";

function disposeMaterial(material: THREE.Material): void {
  const record = material as THREE.Material & Record<string, unknown>;
  for (const value of Object.values(record)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

export function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach(disposeMaterial);
  root.userData.disposed = true;
}
