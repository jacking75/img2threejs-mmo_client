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
import type { CreatureAffinity, CreatureArchetype } from "./types";

interface CreatureContext {
  readonly root: THREE.Group;
  readonly core: THREE.Group;
  readonly head: THREE.Group;
  readonly primary: THREE.MeshStandardMaterial;
  readonly secondary: THREE.MeshStandardMaterial;
  readonly glow: THREE.MeshStandardMaterial;
  readonly dark: THREE.MeshStandardMaterial;
}

function appendage(context: CreatureContext, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, position: Vec3, rotation: Vec3 = [0, 0, 0]): THREE.Group {
  const pivot = resourceGroup(`${name}.pivot`);
  pivot.position.set(...position);
  pivot.userData.attachment = { parentId: context.core.name, parentSocket: `${context.core.name}.surface`, localStart: position, contactType: EMBEDDED_ATTACHMENT.contactType, embedDepth: 0.1, gapTolerance: 0.015 };
  pivot.add(resourceMesh(name, geometry, material, [0, 0, 0], [1, 1, 1], rotation));
  context.root.add(pivot);
  return pivot;
}

function createContext(archetype: CreatureArchetype, affinity: CreatureAffinity): CreatureContext {
  const root = resourceGroup(`creature.${affinity.id}.${archetype.id}`);
  const primary = resourceMaterial(affinity.primary, 0.72);
  const secondary = resourceMaterial(affinity.secondary, 0.62);
  const glow = resourceMaterial(affinity.glow, 0.22, 0.18);
  glow.emissive.setHex(affinity.glow);
  glow.emissiveIntensity = 0.35;
  const dark = resourceMaterial(0x24232c, 0.78, 0.08);
  const core = resourceGroup(`creature.${archetype.id}.core`);
  const head = resourceGroup(`creature.${archetype.id}.head`);
  root.add(core, head);
  return { root, core, head, primary, secondary, glow, dark };
}

function buildBody(context: CreatureContext, archetype: CreatureArchetype): void {
  const size = archetype.size;
  if (archetype.bodyPlan === "blob") {
    context.core.position.y = size * 0.62;
    context.core.add(resourceMesh(`creature.${archetype.id}.body`, new THREE.SphereGeometry(size * 0.62, 14, 10), context.primary, [0, 0, 0], [1, 0.8, 1.08]));
    context.head.position.set(0, size * 0.88, size * 0.34);
  } else if (archetype.bodyPlan === "biped") {
    context.core.position.y = size * 1.05;
    context.core.add(resourceMesh(`creature.${archetype.id}.body`, new THREE.CapsuleGeometry(size * 0.35, size * 0.7, 5, 10), context.primary));
    context.head.position.set(0, size * 1.78, size * 0.06);
    context.head.add(resourceMesh(`creature.${archetype.id}.head.volume`, new THREE.SphereGeometry(size * 0.38, 11, 8), context.primary));
    for (const side of [-1, 1] as const) {
      appendage(context, `creature.${archetype.id}.arm.${side < 0 ? "L" : "R"}`, new THREE.CapsuleGeometry(size * 0.08, size * 0.74, 4, 7), context.primary, [side * size * 0.47, size * 1.08, 0], [0, 0, side * -0.2]);
      appendage(context, `creature.${archetype.id}.leg.${side < 0 ? "L" : "R"}`, new THREE.CapsuleGeometry(size * 0.1, size * 0.62, 4, 7), context.primary, [side * size * 0.22, size * 0.4, 0]);
    }
  } else if (archetype.bodyPlan === "quadruped") {
    context.core.position.y = size * 0.78;
    context.core.add(resourceMesh(`creature.${archetype.id}.body`, new THREE.CapsuleGeometry(size * 0.38, size * 0.85, 5, 10), context.primary, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
    context.head.position.set(0, size * 0.88, size * 0.76);
    context.head.add(resourceMesh(`creature.${archetype.id}.head.volume`, new THREE.SphereGeometry(size * 0.36, 11, 8), context.primary, [0, 0, 0], [1, 0.9, 1.1]));
    for (const side of [-1, 1] as const) for (const end of [-1, 1] as const) appendage(context, `creature.${archetype.id}.leg.${side < 0 ? "L" : "R"}.${end < 0 ? "rear" : "front"}`, new THREE.CapsuleGeometry(size * 0.075, size * 0.52, 4, 7), context.primary, [side * size * 0.34, size * 0.42, end * size * 0.42]);
  } else if (archetype.bodyPlan === "insect") {
    context.core.position.y = size * 0.5;
    context.core.add(resourceMesh(`creature.${archetype.id}.body`, new THREE.SphereGeometry(size * 0.44, 12, 8), context.primary, [0, 0, -size * 0.26], [1.15, 0.75, 1.3]));
    context.head.position.set(0, size * 0.5, size * 0.48);
    context.head.add(resourceMesh(`creature.${archetype.id}.head.volume`, new THREE.SphereGeometry(size * 0.28, 10, 7), context.secondary));
    for (const side of [-1, 1] as const) for (let index = 0; index < 4; index += 1) appendage(context, `creature.${archetype.id}.leg.${side < 0 ? "L" : "R"}.${index + 1}`, new THREE.CapsuleGeometry(size * 0.035, size * (0.55 + index * 0.04), 3, 6), context.dark, [side * size * 0.42, size * 0.42, size * (0.35 - index * 0.24)], [0, 0, side * -1.05]);
  } else if (archetype.bodyPlan === "flying") {
    context.core.position.y = size * 1.15;
    context.core.add(resourceMesh(`creature.${archetype.id}.body`, new THREE.CapsuleGeometry(size * 0.28, size * 0.62, 5, 9), context.primary));
    context.head.position.set(0, size * 1.72, size * 0.08);
    context.head.add(resourceMesh(`creature.${archetype.id}.head.volume`, new THREE.SphereGeometry(size * 0.32, 10, 7), context.primary));
  } else {
    context.core.position.y = size * 0.95;
    context.core.add(resourceMesh(`creature.${archetype.id}.body`, new THREE.DodecahedronGeometry(size * 0.55, 0), context.primary, [0, 0, 0], [1, 1.15, 0.8]));
    context.head.position.set(0, size * 1.72, 0);
    context.head.add(resourceMesh(`creature.${archetype.id}.head.volume`, new THREE.BoxGeometry(size * 0.65, size * 0.55, size * 0.55), context.secondary));
    context.head.add(resourceMesh(`creature.${archetype.id}.face-plate`, new THREE.BoxGeometry(size * 0.52, size * 0.34, size * 0.07), context.dark, [0, 0, size * 0.3]));
    context.head.add(resourceMesh(`creature.${archetype.id}.jaw`, new THREE.BoxGeometry(size * 0.36, size * 0.12, size * 0.12), context.primary, [0, -size * 0.3, size * 0.18]));
    for (const side of [-1, 1] as const) appendage(context, `creature.${archetype.id}.arm.${side < 0 ? "L" : "R"}`, new THREE.CapsuleGeometry(size * 0.12, size * 0.75, 4, 7), context.primary, [side * size * 0.58, size * 1.0, 0], [0, 0, side * -0.25]);
    for (const side of [-1, 1] as const) appendage(context, `creature.${archetype.id}.leg.${side < 0 ? "L" : "R"}`, new THREE.BoxGeometry(size * 0.25, size * 0.65, size * 0.28), context.primary, [side * size * 0.26, size * 0.35, 0]);
  }
}

function addEyes(context: CreatureContext, archetype: CreatureArchetype): void {
  for (const side of [-1, 1] as const) context.head.add(resourceMesh(`creature.${archetype.id}.eye.${side < 0 ? "L" : "R"}`, new THREE.SphereGeometry(archetype.size * 0.065, 8, 6), context.glow, [side * archetype.size * 0.13, archetype.size * 0.05, archetype.size * 0.36]));
}

function addSignature(context: CreatureContext, archetype: CreatureArchetype): void {
  const name = `creature.${archetype.id}.${archetype.signature}`;
  const group = resourceGroup(name);
  const size = archetype.size;
  if (archetype.signature === "wings" || archetype.signature === "bat-wings") {
    for (const side of [-1, 1] as const) {
      const points: Array<readonly [number, number]> = archetype.signature === "bat-wings" ? [[0, 0], [side * size * 1.25, size * 0.55], [side * size * 0.92, -size * 0.2], [side * size * 0.5, size * 0.05]] : [[0, 0], [side * size * 1.15, size * 0.12], [side * size * 0.72, -size * 0.4]];
      const shape = new THREE.Shape();
      points.forEach(([x, y], index) => index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
      shape.closePath();
      const wing = resourceMesh(`${name}.${side < 0 ? "L" : "R"}`, new THREE.ExtrudeGeometry(shape, { depth: size * 0.04, bevelEnabled: true, bevelSize: size * 0.02, bevelThickness: size * 0.02 }), context.secondary);
      wing.userData.attachment = { parentId: context.core.name, parentSocket: "core.back", localStart: [0, size * 0.2, 0], localEnd: [side * size * 1.15, size * 0.25, 0], contactType: "embedded", overlap: size * 0.08, gapTolerance: 0.015 };
      group.add(wing);
    }
  } else if (archetype.signature === "fangs" || archetype.signature === "jaws") {
    for (const side of [-1, 1] as const) group.add(resourceMesh(`${name}.${side < 0 ? "L" : "R"}`, new THREE.ConeGeometry(size * (archetype.signature === "jaws" ? 0.1 : 0.06), size * 0.38, 6), context.secondary, [side * size * 0.14, -size * 0.12, size * 0.35], [1, 1, 1], [Math.PI / 2, 0, 0]));
    context.head.add(group);
    return;
  } else if (archetype.signature === "claws") {
    for (const side of [-1, 1] as const) {
      const claw = resourceGroup(`${name}.${side < 0 ? "L" : "R"}`);
      claw.add(resourceMesh(`${claw.name}.palm`, new THREE.SphereGeometry(size * 0.22, 8, 6), context.primary));
      for (const spread of [-1, 1] as const) claw.add(resourceMesh(`${claw.name}.pincer.${spread < 0 ? "inner" : "outer"}`, new THREE.ConeGeometry(size * 0.08, size * 0.48, 6), context.secondary, [spread * size * 0.13, 0, size * 0.2], [1, 1, 1], [Math.PI / 2, 0, spread * 0.25]));
      claw.position.set(side * size * 0.75, size * 0.55, size * 0.35);
      group.add(claw);
    }
  } else if (archetype.signature === "mushroom-cap") {
    group.add(resourceMesh(`${name}.cap`, new THREE.SphereGeometry(size * 0.72, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), context.secondary));
    for (let index = 0; index < 7; index += 1) group.add(resourceMesh(`${name}.spot.${index + 1}`, new THREE.SphereGeometry(size * 0.065, 6, 4), context.glow, [Math.sin(index) * size * 0.4, size * 0.18, Math.cos(index) * size * 0.36]));
    group.position.copy(context.head.position).add(new THREE.Vector3(0, size * 0.18, 0));
  } else if (archetype.signature === "roots" || archetype.signature === "tentacles") {
    const count = archetype.signature === "roots" ? 6 : 5;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      group.add(resourceMesh(`${name}.${index + 1}`, new THREE.ConeGeometry(size * 0.09, size * 0.65, 6), context.secondary, [Math.sin(angle) * size * 0.35, size * 0.28, Math.cos(angle) * size * 0.35], [1, 1, 1], [Math.sin(angle) * 0.55, 0, -Math.cos(angle) * 0.55]));
    }
  } else if (archetype.signature === "shield" || archetype.signature === "shell") {
    group.add(resourceMesh(`${name}.plate`, new THREE.SphereGeometry(size * 0.55, 10, 7), context.secondary, [0, size * 0.78, -size * 0.38], [1, 0.85, 0.45]));
    for (let index = 0; index < 5; index += 1) group.add(resourceMesh(`${name}.ridge.${index + 1}`, new THREE.BoxGeometry(size * 0.06, size * 0.65, size * 0.05), context.dark, [(index - 2) * size * 0.16, size * 0.8, -size * 0.64]));
  } else if (archetype.signature === "skull") {
    group.add(resourceMesh(`${name}.mask`, new THREE.DodecahedronGeometry(size * 0.32, 0), context.secondary, [0, 0, size * 0.23], [1, 0.9, 0.45]));
    for (const side of [-1, 1] as const) group.add(resourceMesh(`${name}.socket.${side < 0 ? "L" : "R"}`, new THREE.SphereGeometry(size * 0.08, 7, 5), context.dark, [side * size * 0.12, size * 0.05, size * 0.36]));
    context.head.add(group);
    return;
  } else {
    for (let index = 0; index < 6; index += 1) group.add(resourceMesh(`${name}.${index + 1}`, new THREE.OctahedronGeometry(size * (0.11 + index % 2 * 0.04), 0), context.glow, [Math.sin(index * 1.7) * size * 0.42, size * (0.7 + (index % 3) * 0.22), Math.cos(index * 1.7) * size * 0.35], [0.7, 1.6, 0.7]));
  }
  context.root.add(group);
}

function addAffinity(context: CreatureContext, archetype: CreatureArchetype, affinity: CreatureAffinity): void {
  const group = resourceGroup(affinity.signaturePart);
  const size = archetype.size;
  if (affinity.id === "verdant") {
    group.add(resourceMesh(`${group.name}.vine`, new THREE.TorusKnotGeometry(size * 0.2, size * 0.035, 30, 5), context.secondary, [0, size * 1.35, 0], [1, 1, 0.7]));
  } else if (affinity.id === "void") {
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2;
      group.add(resourceMesh(`${group.name}.${index + 1}`, new THREE.TorusGeometry(size * 0.12, size * 0.025, 5, 12), context.glow, [Math.cos(angle) * size * 0.72, size * (0.9 + index % 2 * 0.35), Math.sin(angle) * size * 0.45], [1, 1, 0.55], [Math.PI / 2, 0, angle]));
    }
  } else {
    for (let index = 0; index < 5; index += 1) group.add(resourceMesh(`${group.name}.${index + 1}`, affinity.id === "ember" ? new THREE.ConeGeometry(size * 0.09, size * 0.42, 6) : new THREE.OctahedronGeometry(size * 0.14, 0), context.glow, [(index - 2) * size * 0.2, size * (1.15 + Math.abs(index - 2) * -0.08), -size * 0.22], [0.75, 1.35, 0.75]));
  }
  context.root.add(group);
}

export function createCreatureResource(archetype: CreatureArchetype, affinity: CreatureAffinity): THREE.Group {
  const context = createContext(archetype, affinity);
  buildBody(context, archetype);
  addEyes(context, archetype);
  addSignature(context, archetype);
  addAffinity(context, archetype, affinity);
  const sockets = {
    loot: resourceSocket("socket.loot", [0, archetype.size * 0.55, 0], context.core),
    target: resourceSocket("socket.target", [0, archetype.size * 0.3, 0], context.head),
    effect: resourceSocket("socket.effect", [0, archetype.size * 1.4, 0], context.root),
  };
  context.root.userData.resource = { id: context.root.name, type: "creature", archetypeId: archetype.id, affinityId: affinity.id, original: true, procedural: true, quality: "runtime-gallery", axis: { forward: "+Z", up: "+Y" }, dispose: "deep-geometry-and-materials" };
  annotateResourceTree(context.root, "creature", context.root.name);
  context.root.userData.sculptRuntime = { nodes: collectResourceNodes(context.root), sockets, colliders: [context.core, context.head], destructionGroups: { core: [context.core.name], appendages: context.root.children.filter((node) => node.name.endsWith(".pivot")).map((node) => node.name) } };
  return context.root;
}

export const disposeCreatureResource = disposeResourceTree;
