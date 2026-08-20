import * as THREE from "three";
import {
  EMBEDDED_ATTACHMENT,
  annotateResourceTree,
  collectResourceNodes,
  disposeResourceTree,
  resourceGroup,
  resourceMaterial,
  resourceMesh,
  resourceSocket,
  type Vec3,
} from "../resourceToolkit";
import type { FaunaSpecies, FaunaTrait, FaunaVariant } from "./types";

interface FaunaPalette {
  readonly primary: THREE.MeshStandardMaterial;
  readonly secondary: THREE.MeshStandardMaterial;
  readonly accent: THREE.MeshStandardMaterial;
  readonly dark: THREE.MeshStandardMaterial;
  readonly eye: THREE.MeshStandardMaterial;
}

function createPalette(variant: FaunaVariant): FaunaPalette {
  return {
    primary: resourceMaterial(variant.primary, 0.84),
    secondary: resourceMaterial(variant.secondary, 0.78),
    accent: resourceMaterial(variant.accent, 0.5, variant.id === "arcane" ? 0.25 : 0.05),
    dark: resourceMaterial(0x292731, 0.82),
    eye: resourceMaterial(0x11151b, 0.18, 0.05),
  };
}

function has(species: FaunaSpecies, trait: FaunaTrait): boolean {
  return species.traits.includes(trait);
}

function addEyes(head: THREE.Group, species: FaunaSpecies, palette: FaunaPalette): void {
  for (const side of [-1, 1] as const) {
    const eyeName = `fauna.${species.id}.eye.${side < 0 ? "L" : "R"}`;
    head.add(resourceMesh(eyeName, new THREE.SphereGeometry(Math.max(0.025, species.size * 0.045), 8, 6), palette.eye, [side * species.head[0] * 0.52, species.head[1] * 0.12, species.head[2] * 0.46]));
    head.add(resourceMesh(`${eyeName}.glint`, new THREE.SphereGeometry(Math.max(0.008, species.size * 0.012), 6, 4), palette.secondary, [side * species.head[0] * 0.54, species.head[1] * 0.14, species.head[2] * 0.5]));
  }
}

function addAppendage(
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
  scale: Vec3 = [1, 1, 1],
): THREE.Group {
  const pivot = resourceGroup(`${name}.pivot`);
  pivot.position.set(...position);
  pivot.userData.attachment = { parentId: parent.name, parentSocket: `${parent.name}.surface`, localStart: position, contactType: EMBEDDED_ATTACHMENT.contactType, embedDepth: EMBEDDED_ATTACHMENT.embedDepth, gapTolerance: EMBEDDED_ATTACHMENT.gapTolerance };
  pivot.add(resourceMesh(name, geometry, material, [0, 0, 0], scale, rotation));
  parent.add(pivot);
  return pivot;
}

function addLegs(root: THREE.Group, species: FaunaSpecies, palette: FaunaPalette, baseY: number): void {
  const bodyWidth = species.body[0];
  const bodyLength = species.body[2];
  for (const side of [-1, 1] as const) {
    for (const longitudinal of [-1, 1] as const) {
      const name = `fauna.${species.id}.leg.${side < 0 ? "L" : "R"}.${longitudinal < 0 ? "rear" : "front"}`;
      const x = side * bodyWidth * 0.62;
      const z = longitudinal * bodyLength * 0.38;
      const leg = addAppendage(root, name, new THREE.CapsuleGeometry(Math.max(0.07, species.size * 0.075), species.leg, 4, 7), palette.primary, [x, baseY - species.leg * 0.5, z]);
      const footScale: Vec3 = has(species, "webbed") ? [1.7, 0.45, 1.45] : [1.15, 0.6, 1.35];
      leg.add(resourceMesh(`${name}.foot`, new THREE.SphereGeometry(Math.max(0.09, species.size * 0.1), 8, 6), palette.dark, [0, -species.leg * 0.52, species.size * 0.04], footScale));
    }
  }
}

function addEars(head: THREE.Group, species: FaunaSpecies, palette: FaunaPalette): void {
  if (species.bodyPlan === "bird" || species.bodyPlan === "reptile" || species.bodyPlan === "amphibian" || species.bodyPlan === "serpent") return;
  const long = has(species, "long-ears");
  const floppy = has(species, "floppy-ears");
  for (const side of [-1, 1] as const) {
    const ear = addAppendage(head, `fauna.${species.id}.ear.${side < 0 ? "L" : "R"}`, new THREE.ConeGeometry(species.head[0] * 0.18, species.head[1] * (long ? 1.15 : 0.5), 6), palette.secondary, [side * species.head[0] * 0.48, species.head[1] * 0.5, -species.head[2] * 0.08]);
    ear.rotation.z = side * (floppy ? 1.05 : -0.22);
  }
}

function addTraits(root: THREE.Group, head: THREE.Group, body: THREE.Group, species: FaunaSpecies, palette: FaunaPalette): void {
  if (has(species, "long-snout")) {
    head.add(resourceMesh(`fauna.${species.id}.snout`, new THREE.CapsuleGeometry(species.head[0] * 0.28, species.head[2] * 0.62, 4, 8), palette.primary, [0, -species.head[1] * 0.1, species.head[2] * 0.58], [1.2, 0.78, 1], [Math.PI / 2, 0, 0]));
  }
  if (has(species, "beak")) {
    head.add(resourceMesh(`fauna.${species.id}.beak`, new THREE.ConeGeometry(species.head[0] * 0.24, species.head[2] * 0.58, 6), palette.accent, [0, -0.03, species.head[2] * 0.62], [1, 0.72, 1], [Math.PI / 2, 0, 0]));
  }
  if (has(species, "horns") || has(species, "antlers")) {
    for (const side of [-1, 1] as const) {
      const hornName = `fauna.${species.id}.${has(species, "antlers") ? "antler" : "horn"}.${side < 0 ? "L" : "R"}`;
      const horn = addAppendage(head, hornName, new THREE.ConeGeometry(species.size * 0.08, species.size * (has(species, "antlers") ? 0.68 : 0.5), 7), palette.accent, [side * species.head[0] * 0.42, species.head[1] * 0.5, 0], [0, 0, side * -0.42]);
      if (has(species, "antlers")) {
        for (let index = 0; index < 2; index += 1) horn.add(resourceMesh(`${hornName}.tine.${index + 1}`, new THREE.ConeGeometry(species.size * 0.045, species.size * 0.3, 6), palette.accent, [side * species.size * (0.08 + index * 0.06), species.size * (0.2 + index * 0.14), 0], [1, 1, 1], [0, 0, side * -0.7]));
      }
    }
  }
  if (has(species, "tusks")) {
    for (const side of [-1, 1] as const) head.add(resourceMesh(`fauna.${species.id}.tusk.${side < 0 ? "L" : "R"}`, new THREE.ConeGeometry(species.size * 0.055, species.size * 0.38, 7), palette.secondary, [side * species.head[0] * 0.34, -species.head[1] * 0.18, species.head[2] * 0.55], [1, 1, 1], [Math.PI / 2.4, 0, side * 0.18]));
  }
  if (has(species, "mane") || has(species, "wool")) {
    const count = has(species, "wool") ? 12 : 7;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      body.add(resourceMesh(`fauna.${species.id}.${has(species, "wool") ? "wool" : "mane"}.${index + 1}`, new THREE.IcosahedronGeometry(species.size * (has(species, "wool") ? 0.18 : 0.12), 0), palette.secondary, [Math.sin(angle) * species.body[0] * 0.72, species.body[1] * (0.18 + Math.cos(angle) * 0.45), species.body[2] * 0.28]));
    }
  }
  if (has(species, "spines")) {
    for (let index = 0; index < 8; index += 1) body.add(resourceMesh(`fauna.${species.id}.spine.${index + 1}`, new THREE.ConeGeometry(species.size * 0.05, species.size * 0.32, 5), palette.dark, [0, species.body[1] * 0.58, species.body[2] * (0.42 - index * 0.12)]));
  }
  if (has(species, "hump")) body.add(resourceMesh(`fauna.${species.id}.hump`, new THREE.SphereGeometry(species.size * 0.42, 12, 8), palette.secondary, [0, species.body[1] * 0.7, -species.body[2] * 0.14], [1, 0.8, 1.2]));
  if (has(species, "whiskers")) {
    for (const side of [-1, 1] as const) for (let row = 0; row < 3; row += 1) head.add(resourceMesh(`fauna.${species.id}.whisker.${side < 0 ? "L" : "R"}.${row + 1}`, new THREE.CylinderGeometry(0.008, 0.008, species.size * 0.46, 4), palette.dark, [side * species.head[0] * 0.42, -0.04 + row * 0.05, species.head[2] * 0.48], [1, 1, 1], [0, 0, side * (1.18 + row * 0.08)]));
  }
  if (has(species, "crest")) head.add(resourceMesh(`fauna.${species.id}.crest`, new THREE.ConeGeometry(species.size * 0.12, species.size * 0.38, 5), palette.accent, [0, species.head[1] * 0.68, -species.head[2] * 0.08]));

  const tailKind = has(species, "flat-tail") ? "flat" : has(species, "bushy-tail") ? "bushy" : has(species, "long-tail") ? "long" : "short";
  const tailLength = species.size * (tailKind === "long" ? 1.2 : tailKind === "bushy" ? 0.9 : tailKind === "flat" ? 0.72 : 0.32);
  const tailGeometry = tailKind === "flat"
    ? new THREE.BoxGeometry(species.size * 0.38, species.size * 0.12, tailLength)
    : new THREE.CapsuleGeometry(species.size * (tailKind === "bushy" ? 0.15 : 0.065), tailLength, 5, 8);
  const tail = addAppendage(root, `fauna.${species.id}.tail`, tailGeometry, tailKind === "bushy" ? palette.secondary : palette.primary, [0, species.leg + species.body[1] * 0.75, -species.body[2] * 0.52], [Math.PI / 2.5, 0, 0]);
  tail.rotation.x = -0.34;
}

function buildQuadruped(root: THREE.Group, species: FaunaSpecies, palette: FaunaPalette): { head: THREE.Group; body: THREE.Group } {
  const baseY = Math.max(species.leg, 0.12);
  const body = resourceGroup(`fauna.${species.id}.body`);
  body.position.y = baseY + species.body[1] * 0.62;
  body.add(resourceMesh(`fauna.${species.id}.torso`, new THREE.CapsuleGeometry(species.body[0] * 0.62, species.body[2] * 0.68, 6, 12), palette.primary, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  root.add(body);
  const head = resourceGroup(`fauna.${species.id}.head`);
  head.position.set(0, baseY + species.body[1] * 0.9, species.body[2] * 0.72);
  head.add(resourceMesh(`fauna.${species.id}.head.volume`, new THREE.SphereGeometry(0.5, 12, 9), palette.primary, [0, 0, 0], species.head));
  root.add(head);
  addLegs(root, species, palette, baseY + species.body[1] * 0.48);
  addEars(head, species, palette);
  addEyes(head, species, palette);
  return { head, body };
}

function buildBird(root: THREE.Group, species: FaunaSpecies, palette: FaunaPalette): { head: THREE.Group; body: THREE.Group } {
  const body = resourceGroup(`fauna.${species.id}.body`);
  const baseY = species.leg + species.body[1] * 0.5;
  body.position.y = baseY;
  body.add(resourceMesh(`fauna.${species.id}.torso`, new THREE.SphereGeometry(0.5, 12, 9), palette.primary, [0, 0, 0], species.body));
  root.add(body);
  const head = resourceGroup(`fauna.${species.id}.head`);
  head.position.set(0, baseY + species.body[1] * 0.62, species.body[2] * 0.28);
  head.add(resourceMesh(`fauna.${species.id}.head.volume`, new THREE.SphereGeometry(0.5, 12, 9), palette.primary, [0, 0, 0], species.head));
  root.add(head);
  for (const side of [-1, 1] as const) {
    const wing = addAppendage(body, `fauna.${species.id}.wing.${side < 0 ? "L" : "R"}`, new THREE.ConeGeometry(species.size * 0.28, species.size * 1.1, 7), palette.secondary, [side * species.body[0] * 0.48, 0, 0], [0, 0, side * -0.85]);
    wing.userData.animationPivot = "wing-root";
    const leg = addAppendage(root, `fauna.${species.id}.leg.${side < 0 ? "L" : "R"}`, new THREE.CapsuleGeometry(species.size * 0.045, species.leg, 4, 6), palette.dark, [side * species.body[0] * 0.25, species.leg * 0.5, 0]);
    leg.add(resourceMesh(`fauna.${species.id}.foot.${side < 0 ? "L" : "R"}`, new THREE.SphereGeometry(species.size * 0.09, 7, 5), palette.accent, [0, -species.leg * 0.5, species.size * 0.08], [1.6, 0.45, 1.8]));
  }
  addEyes(head, species, palette);
  return { head, body };
}

function buildLowBody(root: THREE.Group, species: FaunaSpecies, palette: FaunaPalette): { head: THREE.Group; body: THREE.Group } {
  const baseY = species.body[1] * 0.48 + 0.12;
  const body = resourceGroup(`fauna.${species.id}.body`);
  body.position.y = baseY;
  body.add(resourceMesh(`fauna.${species.id}.torso`, new THREE.CapsuleGeometry(species.body[0] * 0.58, species.body[2] * 0.68, 5, 10), palette.primary, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
  if (has(species, "shell")) body.add(resourceMesh(`fauna.${species.id}.shell`, new THREE.SphereGeometry(0.55, 12, 8), palette.secondary, [0, species.body[1] * 0.25, -0.05], [species.body[0] * 1.18, species.body[1] * 0.84, species.body[2] * 0.86]));
  root.add(body);
  const head = resourceGroup(`fauna.${species.id}.head`);
  head.position.set(0, baseY, species.body[2] * 0.65);
  head.add(resourceMesh(`fauna.${species.id}.head.volume`, new THREE.SphereGeometry(0.5, 10, 7), palette.primary, [0, 0, 0], species.head));
  root.add(head);
  addEyes(head, species, palette);
  if (species.bodyPlan !== "serpent") addLegs(root, species, palette, baseY - species.body[1] * 0.25);
  return { head, body };
}

function addVariant(head: THREE.Group, body: THREE.Group, species: FaunaSpecies, variant: FaunaVariant, palette: FaunaPalette): void {
  const variantGroup = resourceGroup(variant.signaturePart);
  if (variant.id === "wild") {
    variantGroup.add(resourceMesh(`${variant.signaturePart}.cord`, new THREE.TorusGeometry(species.size * 0.28, species.size * 0.025, 6, 18), palette.accent, [0, 0, 0], [1, 1, 0.8], [Math.PI / 2, 0, 0]));
    variantGroup.add(resourceMesh(`${variant.signaturePart}.token`, new THREE.CylinderGeometry(species.size * 0.07, species.size * 0.07, species.size * 0.025, 7), palette.secondary, [0, -species.size * 0.25, species.size * 0.08], [1, 1, 1], [Math.PI / 2, 0, 0]));
    head.add(variantGroup);
  } else if (variant.id === "highland") {
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * Math.PI * 2;
      variantGroup.add(resourceMesh(`${variant.signaturePart}.${index + 1}`, new THREE.IcosahedronGeometry(species.size * 0.13, 0), palette.secondary, [Math.sin(angle) * species.size * 0.28, Math.cos(angle) * species.size * 0.2, 0]));
    }
    head.add(variantGroup);
  } else if (variant.id === "dusk") {
    variantGroup.add(resourceMesh(`${variant.signaturePart}.band`, new THREE.TorusGeometry(species.size * 0.31, species.size * 0.07, 7, 20), palette.dark, [0, 0, 0], [1, 1, 0.78], [Math.PI / 2, 0, 0]));
    for (const side of [-1, 1] as const) variantGroup.add(resourceMesh(`${variant.signaturePart}.plate.${side < 0 ? "L" : "R"}`, new THREE.BoxGeometry(species.size * 0.24, species.size * 0.22, species.size * 0.08), palette.accent, [side * species.size * 0.26, 0, species.size * 0.05], [1, 1, 1], [0, 0, side * 0.35]));
    head.add(variantGroup);
  } else {
    for (let index = 0; index < 3; index += 1) {
      const crystal = resourceMesh(`${variant.signaturePart}.${index + 1}`, new THREE.OctahedronGeometry(species.size * (0.12 + index * 0.02), 0), palette.accent, [(index - 1) * species.size * 0.2, species.size * (0.2 + Math.abs(index - 1) * -0.05), 0], [0.7, 1.6, 0.7]);
      variantGroup.add(crystal);
    }
    body.add(variantGroup);
  }
}

export function createFaunaResource(species: FaunaSpecies, variant: FaunaVariant): THREE.Group {
  const root = resourceGroup(`fauna.${variant.id}.${species.id}`);
  const palette = createPalette(variant);
  const result = species.bodyPlan === "quadruped"
    ? buildQuadruped(root, species, palette)
    : species.bodyPlan === "bird"
      ? buildBird(root, species, palette)
      : buildLowBody(root, species, palette);
  addTraits(root, result.head, result.body, species, palette);
  addVariant(result.head, result.body, species, variant, palette);
  const sockets = {
    saddle: resourceSocket("socket.saddle", [0, species.leg + species.body[1] * 1.15, 0], root),
    head: resourceSocket("socket.head", [0, 0, species.head[2] * 0.5], result.head),
    mouth: resourceSocket("socket.mouth", [0, -species.head[1] * 0.1, species.head[2] * 0.72], result.head),
  };
  root.userData.resource = { id: root.name, type: "fauna", speciesId: species.id, variantId: variant.id, original: true, procedural: true, quality: "runtime-gallery", axis: { forward: "+Z", up: "+Y" }, dispose: "deep-geometry-and-materials" };
  annotateResourceTree(root, "fauna", root.name);
  root.userData.sculptRuntime = { nodes: collectResourceNodes(root), sockets, colliders: [result.body, result.head], destructionGroups: { body: [result.body.name], appendages: root.children.filter((child) => child.name.includes("leg") || child.name.includes("tail")).map((child) => child.name) } };
  return root;
}

export const disposeFaunaResource = disposeResourceTree;
