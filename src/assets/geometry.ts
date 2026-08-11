import * as THREE from "three";

export function mesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: readonly [number, number, number] = [0, 0, 0],
  scale: readonly [number, number, number] = [1, 1, 1],
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.position.set(...position);
  result.scale.set(...scale);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

export function capsule(
  name: string,
  radius: number,
  length: number,
  material: THREE.Material,
): THREE.Mesh {
  return mesh(name, new THREE.CapsuleGeometry(radius, length, 6, 10), material);
}

export function taperedLock(
  name: string,
  length: number,
  radius: number,
  material: THREE.Material,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const lock = mesh(name, new THREE.ConeGeometry(radius, length, 5), material, position);
  lock.rotation.set(...rotation);
  return lock;
}

export function loftedLock(
  name: string,
  points: readonly (readonly [number, number, number])[],
  rootWidth: number,
  tipWidth: number,
  thickness: number,
  material: THREE.Material,
  radialSegments = 6,
): THREE.Mesh {
  if (points.length < 2) throw new Error("A lofted lock needs at least two control points");

  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const tubularSegments = Math.max(5, points.length * 3);
  const centers = curve.getSpacedPoints(tubularSegments);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const reference = new THREE.Vector3();

  centers.forEach((center, ringIndex) => {
    const t = ringIndex / tubularSegments;
    curve.getTangentAt(Math.min(t, 0.9999), tangent).normalize();
    reference.set(0, 0, 1);
    if (Math.abs(tangent.dot(reference)) > 0.92) reference.set(1, 0, 0);
    side.crossVectors(tangent, reference).normalize();
    normal.crossVectors(side, tangent).normalize();

    const taper = Math.pow(1 - t, 0.72);
    const width = THREE.MathUtils.lerp(tipWidth, rootWidth, taper);
    const depth = Math.max(thickness * (0.2 + taper * 0.8), tipWidth * 0.35);
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const vertex = center.clone()
        .addScaledVector(side, Math.cos(angle) * width)
        .addScaledVector(normal, Math.sin(angle) * depth);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(segment / radialSegments, t);
    }
  });

  for (let ring = 0; ring < tubularSegments; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + nextSegment;
      const c = (ring + 1) * radialSegments + nextSegment;
      const d = (ring + 1) * radialSegments + segment;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.name = "procedural.tapered-ribbon";
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const result = mesh(name, geometry, material);
  result.userData.proceduralPart = "tapered-ribbon";
  return result;
}

export function outlineShape(points: readonly (readonly [number, number])[]): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

export function extrudedShape(
  name: string,
  points: readonly (readonly [number, number])[],
  depth: number,
  material: THREE.Material,
  bevelSize = 0.025,
): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(outlineShape(points), {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize,
    bevelThickness: bevelSize,
    curveSegments: 2,
  });
  geometry.translate(0, 0, -depth / 2);
  return mesh(name, geometry, material);
}

export function collectNamedNodes(root: THREE.Object3D): Record<string, THREE.Object3D> {
  const nodes: Record<string, THREE.Object3D> = {};
  root.traverse((node) => {
    if (node.name) nodes[node.name] = node;
  });
  return nodes;
}
