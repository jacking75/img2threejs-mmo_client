import * as THREE from "three";
import {
  annotateResourceTree,
  collectResourceNodes,
  disposeResourceTree,
  resourceGroup,
  resourceMaterial,
  resourceMesh,
  resourceSocket,
  type Vec3,
} from "../resourceToolkit";
import type { WorldPropArchetype, WorldStyle } from "./types";

interface PropContext {
  readonly root: THREE.Group;
  readonly structure: THREE.Group;
  readonly primary: THREE.MeshStandardMaterial;
  readonly secondary: THREE.MeshStandardMaterial;
  readonly accent: THREE.MeshStandardMaterial;
  readonly wood: THREE.MeshStandardMaterial;
  readonly stone: THREE.MeshStandardMaterial;
  readonly metal: THREE.MeshStandardMaterial;
  readonly glow: THREE.MeshStandardMaterial;
}

function box(context: PropContext, name: string, size: Vec3, position: Vec3, material: THREE.Material = context.wood, rotation: Vec3 = [0, 0, 0], parent: THREE.Object3D = context.structure): THREE.Mesh {
  const result = resourceMesh(name, new THREE.BoxGeometry(...size), material, position, [1, 1, 1], rotation);
  parent.add(result);
  return result;
}

function cylinder(context: PropContext, name: string, radius: number, height: number, position: Vec3, material: THREE.Material = context.wood, rotation: Vec3 = [0, 0, 0], parent: THREE.Object3D = context.structure): THREE.Mesh {
  const result = resourceMesh(name, new THREE.CylinderGeometry(radius, radius, height, 12), material, position, [1, 1, 1], rotation);
  parent.add(result);
  return result;
}

function createContext(archetype: WorldPropArchetype, style: WorldStyle): PropContext {
  const root = resourceGroup(`world.${style.id}.${archetype.id}`);
  const structure = resourceGroup(`world.${archetype.id}.structure`);
  root.add(structure);
  const glow = resourceMaterial(style.accent, 0.18, 0.12);
  glow.emissive.setHex(style.accent);
  glow.emissiveIntensity = 0.35;
  return {
    root,
    structure,
    primary: resourceMaterial(style.primary, 0.74),
    secondary: resourceMaterial(style.secondary, 0.72),
    accent: resourceMaterial(style.accent, 0.42, 0.2),
    wood: resourceMaterial(0x795335, 0.88),
    stone: resourceMaterial(0x687079, 0.92),
    metal: resourceMaterial(0x8d9aa2, 0.35, 0.68),
    glow,
  };
}

function addWheels(context: PropContext, size: number, z: number): void {
  for (const side of [-1, 1] as const) {
    const wheel = resourceMesh(`world.wheel.${side < 0 ? "L" : "R"}`, new THREE.TorusGeometry(size * 0.3, size * 0.07, 7, 18), context.wood, [side * size * 0.65, size * 0.32, z], [1, 1, 1], [0, Math.PI / 2, 0]);
    context.structure.add(wheel);
    for (let index = 0; index < 8; index += 1) box(context, `${wheel.name}.spoke.${index + 1}`, [size * 0.035, size * 0.5, size * 0.035], [side * size * 0.65, size * 0.32, z], context.wood, [index * Math.PI / 4, 0, Math.PI / 2]);
  }
}

function addArchetype(context: PropContext, archetype: WorldPropArchetype): void {
  const s = archetype.size;
  const signature = resourceGroup(archetype.signaturePart);
  switch (archetype.id) {
    case "market-stall":
      box(context, "world.market-stall.counter", [s * 1.7, s * 0.16, s * 0.8], [0, s * 0.75, 0]);
      for (const side of [-1, 1] as const) cylinder(context, `world.market-stall.post.${side < 0 ? "L" : "R"}`, s * 0.055, s * 1.8, [side * s * 0.72, s * 0.9, -s * 0.28]);
      signature.add(resourceMesh(`${archetype.signaturePart}.cloth`, new THREE.BoxGeometry(s * 1.9, s * 0.08, s * 1.05), context.primary, [0, s * 1.78, 0], [1, 1, 1], [0.08, 0, 0]));
      break;
    case "merchant-wagon":
      box(context, "world.merchant-wagon.bed", [s * 1.25, s * 0.26, s * 2], [0, s * 0.65, 0]);
      addWheels(context, s, 0);
      for (let index = 0; index < 5; index += 1) signature.add(resourceMesh(`${archetype.signaturePart}.${index + 1}`, new THREE.BoxGeometry(s * 0.36, s * 0.38, s * 0.42), index % 2 === 0 ? context.primary : context.wood, [(index % 3 - 1) * s * 0.4, s * (0.95 + Math.floor(index / 3) * 0.35), (index % 2 - 0.5) * s * 0.5]));
      break;
    case "treasure-chest": {
      box(context, "world.treasure-chest.base", [s * 1.5, s * 0.72, s * 0.85], [0, s * 0.36, 0]);
      const lid = signature;
      lid.position.set(0, s * 0.72, -s * 0.4);
      lid.userData.animationPivot = "hinge";
      lid.add(resourceMesh(`${archetype.signaturePart}.shell`, new THREE.BoxGeometry(s * 1.5, s * 0.42, s * 0.85), context.primary, [0, s * 0.2, s * 0.4]));
      lid.add(resourceMesh(`${archetype.signaturePart}.lock`, new THREE.BoxGeometry(s * 0.22, s * 0.3, s * 0.08), context.accent, [0, s * 0.06, s * 0.84]));
      break;
    }
    case "barrel-rack":
      for (const side of [-1, 1] as const) box(context, `world.barrel-rack.frame.${side < 0 ? "L" : "R"}`, [s * 0.12, s * 1.45, s * 1.1], [side * s * 0.78, s * 0.72, 0]);
      for (let index = 0; index < 4; index += 1) signature.add(resourceMesh(`${archetype.signaturePart}.${index + 1}`, new THREE.CylinderGeometry(s * 0.34, s * 0.34, s * 1.0, 12), context.wood, [(index % 2 - 0.5) * s * 0.78, s * (0.38 + Math.floor(index / 2) * 0.72), 0], [1, 1, 1], [0, 0, Math.PI / 2]));
      break;
    case "adventurer-tent":
      signature.add(resourceMesh(`${archetype.signaturePart}.roof`, new THREE.ConeGeometry(s * 1.3, s * 1.5, 4), context.primary, [0, s * 0.75, 0], [1, 1, 1], [0, Math.PI / 4, 0]));
      box(context, "world.adventurer-tent.bedroll", [s * 0.78, s * 0.18, s * 1.25], [0, s * 0.1, s * 0.18], context.secondary);
      break;
    case "roadside-shrine":
      box(context, "world.roadside-shrine.plinth", [s * 1.15, s * 0.3, s * 0.9], [0, s * 0.15, 0], context.stone);
      signature.add(resourceMesh(`${archetype.signaturePart}.figure`, new THREE.DodecahedronGeometry(s * 0.36, 0), context.secondary, [0, s * 1.0, 0], [0.7, 1.55, 0.7]));
      signature.add(resourceMesh(`${archetype.signaturePart}.halo`, new THREE.TorusGeometry(s * 0.45, s * 0.045, 7, 24), context.accent, [0, s * 1.28, 0]));
      break;
    case "village-fountain":
      cylinder(context, "world.village-fountain.basin", s * 0.92, s * 0.28, [0, s * 0.14, 0], context.stone);
      cylinder(context, "world.village-fountain.column", s * 0.18, s * 1.05, [0, s * 0.78, 0], context.stone);
      signature.add(resourceMesh(`${archetype.signaturePart}.bowl`, new THREE.CylinderGeometry(s * 0.58, s * 0.42, s * 0.18, 16), context.glow, [0, s * 1.34, 0]));
      break;
    case "tavern-bench":
      box(context, "world.tavern-bench.seat", [s * 2, s * 0.18, s * 0.62], [0, s * 0.62, 0]);
      for (const side of [-1, 1] as const) box(context, `world.tavern-bench.leg.${side < 0 ? "L" : "R"}`, [s * 0.18, s * 0.62, s * 0.55], [side * s * 0.72, s * 0.31, 0]);
      signature.add(resourceMesh(`${archetype.signaturePart}.plank`, new THREE.BoxGeometry(s * 2, s * 0.62, s * 0.14), context.primary, [0, s * 1.0, -s * 0.26]));
      break;
    case "street-lamp":
      cylinder(context, "world.street-lamp.post", s * 0.08, s * 2.5, [0, s * 1.25, 0], context.metal);
      signature.add(resourceMesh(`${archetype.signaturePart}.frame`, new THREE.CylinderGeometry(s * 0.28, s * 0.34, s * 0.7, 8, 1, true), context.metal, [0, s * 2.55, 0]));
      signature.add(resourceMesh(`${archetype.signaturePart}.light`, new THREE.SphereGeometry(s * 0.2, 10, 7), context.glow, [0, s * 2.55, 0]));
      break;
    case "signpost":
      cylinder(context, "world.signpost.post", s * 0.08, s * 2.2, [0, s * 1.1, 0]);
      for (let index = 0; index < 3; index += 1) signature.add(resourceMesh(`${archetype.signaturePart}.${index + 1}`, new THREE.BoxGeometry(s * (1.0 + index * 0.2), s * 0.28, s * 0.1), index % 2 === 0 ? context.primary : context.secondary, [(index % 2 ? -1 : 1) * s * 0.35, s * (1.5 + index * 0.34), 0], [1, 1, 1], [0, 0, (index - 1) * 0.08]));
      break;
    case "bridge-segment":
      for (let index = 0; index < 7; index += 1) box(context, `world.bridge-segment.plank.${index + 1}`, [s * 1.65, s * 0.13, s * 0.36], [0, s * 0.25, (index - 3) * s * 0.38], index % 2 === 0 ? context.wood : context.secondary);
      for (const side of [-1, 1] as const) signature.add(resourceMesh(`${archetype.signaturePart}.${side < 0 ? "L" : "R"}`, new THREE.TorusGeometry(s * 1.2, s * 0.04, 6, 24, Math.PI), context.primary, [side * s * 0.76, s * 0.55, 0], [1, 1, 1], [0, Math.PI / 2, Math.PI / 2]));
      break;
    case "fence-gate":
      for (const side of [-1, 1] as const) cylinder(context, `world.fence-gate.post.${side < 0 ? "L" : "R"}`, s * 0.12, s * 2.0, [side * s * 1.15, s, 0]);
      signature.position.set(-s * 1.05, s * 0.25, 0);
      signature.userData.animationPivot = "hinge";
      for (let index = 0; index < 5; index += 1) signature.add(resourceMesh(`${archetype.signaturePart}.slat.${index + 1}`, new THREE.BoxGeometry(s * 0.16, s * 1.35, s * 0.12), context.wood, [s * (0.2 + index * 0.42), s * 0.68, 0]));
      break;
    case "village-well":
      cylinder(context, "world.village-well.wall", s * 0.82, s * 0.75, [0, s * 0.38, 0], context.stone);
      for (const side of [-1, 1] as const) cylinder(context, `world.village-well.post.${side < 0 ? "L" : "R"}`, s * 0.08, s * 1.7, [side * s * 0.72, s * 1.2, 0]);
      signature.add(resourceMesh(`${archetype.signaturePart}.axle`, new THREE.CylinderGeometry(s * 0.12, s * 0.12, s * 1.55, 10), context.wood, [0, s * 1.45, 0], [1, 1, 1], [0, 0, Math.PI / 2]));
      signature.add(resourceMesh(`${archetype.signaturePart}.bucket`, new THREE.CylinderGeometry(s * 0.2, s * 0.16, s * 0.38, 10), context.metal, [0, s * 0.62, 0]));
      break;
    case "campfire":
      for (let index = 0; index < 8; index += 1) context.structure.add(resourceMesh(`world.campfire.stone.${index + 1}`, new THREE.DodecahedronGeometry(s * 0.18, 0), context.stone, [Math.sin(index * Math.PI / 4) * s * 0.55, s * 0.16, Math.cos(index * Math.PI / 4) * s * 0.55]));
      for (let index = 0; index < 3; index += 1) signature.add(resourceMesh(`${archetype.signaturePart}.${index + 1}`, new THREE.ConeGeometry(s * (0.25 - index * 0.04), s * (0.85 - index * 0.12), 7), context.glow, [(index - 1) * s * 0.15, s * 0.58, 0]));
      break;
    case "anvil-station":
      box(context, "world.anvil-station.stump", [s * 0.72, s * 0.72, s * 0.72], [0, s * 0.36, 0]);
      signature.add(resourceMesh(`${archetype.signaturePart}.body`, new THREE.BoxGeometry(s * 1.2, s * 0.36, s * 0.48), context.metal, [0, s * 0.94, 0]));
      signature.add(resourceMesh(`${archetype.signaturePart}.horn`, new THREE.ConeGeometry(s * 0.22, s * 0.72, 8), context.metal, [s * 0.72, s * 0.94, 0], [1, 1, 1], [0, 0, -Math.PI / 2]));
      break;
    case "alchemy-table":
      box(context, "world.alchemy-table.top", [s * 1.8, s * 0.16, s * 0.85], [0, s * 0.95, 0]);
      for (const side of [-1, 1] as const) box(context, `world.alchemy-table.leg.${side < 0 ? "L" : "R"}`, [s * 0.18, s * 0.95, s * 0.7], [side * s * 0.72, s * 0.48, 0]);
      for (let index = 0; index < 6; index += 1) signature.add(resourceMesh(`${archetype.signaturePart}.${index + 1}`, index % 2 === 0 ? new THREE.SphereGeometry(s * 0.12, 8, 6) : new THREE.CylinderGeometry(s * 0.07, s * 0.1, s * 0.32, 8), index % 3 === 0 ? context.glow : context.accent, [(index - 2.5) * s * 0.26, s * (1.15 + index % 2 * 0.12), 0]));
      break;
    case "cooking-station":
      for (const side of [-1, 1] as const) cylinder(context, `world.cooking-station.post.${side < 0 ? "L" : "R"}`, s * 0.07, s * 1.5, [side * s * 0.62, s * 0.75, 0]);
      cylinder(context, "world.cooking-station.crossbar", s * 0.06, s * 1.35, [0, s * 1.4, 0], context.metal, [0, 0, Math.PI / 2]);
      signature.add(resourceMesh(`${archetype.signaturePart}.pot`, new THREE.SphereGeometry(s * 0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.68), context.metal, [0, s * 0.72, 0]));
      break;
    case "stable-stall":
      for (const side of [-1, 1] as const) box(context, `world.stable-stall.wall.${side < 0 ? "L" : "R"}`, [s * 0.16, s * 1.7, s * 1.8], [side * s * 1.0, s * 0.85, 0]);
      box(context, "world.stable-stall.back", [s * 2.1, s * 1.7, s * 0.16], [0, s * 0.85, -s * 0.85]);
      signature.add(resourceMesh(`${archetype.signaturePart}.box`, new THREE.BoxGeometry(s * 1.3, s * 0.42, s * 0.5), context.wood, [0, s * 0.45, -s * 0.62]));
      break;
    case "dock-crane":
      cylinder(context, "world.dock-crane.mast", s * 0.12, s * 2.5, [0, s * 1.25, 0]);
      signature.position.set(0, s * 2.25, 0);
      signature.userData.animationPivot = "boom-hinge";
      signature.add(resourceMesh(`${archetype.signaturePart}.beam`, new THREE.BoxGeometry(s * 0.18, s * 0.18, s * 2.3), context.wood, [0, 0, s * 0.85], [1, 1, 1], [-0.25, 0, 0]));
      signature.add(resourceMesh(`${archetype.signaturePart}.hook`, new THREE.TorusGeometry(s * 0.16, s * 0.045, 7, 16, Math.PI * 1.5), context.metal, [0, -s * 1.0, s * 1.65]));
      break;
    case "fishing-boat": {
      const shape = new THREE.Shape();
      shape.moveTo(-s * 1.3, 0); shape.lineTo(s * 1.3, 0); shape.lineTo(s * 0.95, s * 0.65); shape.lineTo(-s * 0.95, s * 0.65); shape.closePath();
      signature.add(resourceMesh(`${archetype.signaturePart}.shell`, new THREE.ExtrudeGeometry(shape, { depth: s * 0.85, bevelEnabled: true, bevelSize: s * 0.08, bevelThickness: s * 0.08 }), context.primary, [0, s * 0.12, -s * 0.42], [1, 1, 1], [0, Math.PI / 2, 0]));
      cylinder(context, "world.fishing-boat.mast", s * 0.06, s * 1.8, [0, s * 1.05, 0]);
      box(context, "world.fishing-boat.sail", [s * 0.08, s * 1.25, s * 1.0], [0, s * 1.45, s * 0.42], context.secondary);
      break;
    }
    case "watchtower":
      for (const x of [-1, 1] as const) for (const z of [-1, 1] as const) cylinder(context, `world.watchtower.leg.${x < 0 ? "L" : "R"}.${z < 0 ? "rear" : "front"}`, s * 0.09, s * 2.6, [x * s * 0.62, s * 1.3, z * s * 0.62]);
      signature.add(resourceMesh(`${archetype.signaturePart}.deck`, new THREE.BoxGeometry(s * 1.7, s * 0.2, s * 1.7), context.wood, [0, s * 2.45, 0]));
      for (const side of [-1, 1] as const) signature.add(resourceMesh(`${archetype.signaturePart}.rail.${side < 0 ? "L" : "R"}`, new THREE.BoxGeometry(s * 0.14, s * 0.7, s * 1.7), context.primary, [side * s * 0.78, s * 2.85, 0]));
      break;
    case "siege-ballista":
      box(context, "world.siege-ballista.base", [s * 1.45, s * 0.28, s * 1.8], [0, s * 0.42, 0]);
      addWheels(context, s * 0.78, 0);
      signature.position.set(0, s * 0.82, 0);
      signature.userData.animationPivot = "aim-pivot";
      signature.add(resourceMesh(`${archetype.signaturePart}.bow`, new THREE.TorusGeometry(s * 0.85, s * 0.07, 7, 22, Math.PI), context.primary, [0, 0, s * 0.65], [1, 1, 1], [Math.PI / 2, 0, 0]));
      signature.add(resourceMesh(`${archetype.signaturePart}.bolt`, new THREE.CylinderGeometry(s * 0.045, s * 0.045, s * 2.4, 7), context.metal, [0, s * 0.12, 0], [1, 1, 1], [Math.PI / 2, 0, 0]));
      for (const side of [-1, 1] as const) {
        const stringCurve = new THREE.LineCurve3(new THREE.Vector3(side * s * 0.85, 0, s * 0.65), new THREE.Vector3(0, s * 0.08, -s * 0.35));
        signature.add(resourceMesh(`${archetype.signaturePart}.string.${side < 0 ? "L" : "R"}`, new THREE.TubeGeometry(stringCurve, 5, s * 0.012, 4), context.secondary));
      }
      break;
    case "arcane-portal":
      box(context, "world.arcane-portal.base", [s * 1.65, s * 0.35, s * 0.85], [0, s * 0.18, 0], context.stone);
      signature.add(resourceMesh(`${archetype.signaturePart}.outer`, new THREE.TorusGeometry(s * 0.95, s * 0.18, 10, 36), context.primary, [0, s * 1.25, 0]));
      signature.add(resourceMesh(`${archetype.signaturePart}.inner`, new THREE.TorusGeometry(s * 0.7, s * 0.05, 8, 32), context.glow, [0, s * 1.25, 0]));
      break;
    default:
      cylinder(context, "world.training-dummy.post", s * 0.09, s * 2.0, [0, s, 0]);
      signature.position.set(0, s * 1.2, 0);
      signature.userData.animationPivot = "impact-pivot";
      signature.add(resourceMesh(`${archetype.signaturePart}.torso`, new THREE.CapsuleGeometry(s * 0.32, s * 0.75, 5, 9), context.primary));
      signature.add(resourceMesh(`${archetype.signaturePart}.head`, new THREE.SphereGeometry(s * 0.28, 10, 7), context.secondary, [0, s * 0.72, 0]));
      box(context, `${archetype.signaturePart}.arm`, [s * 1.45, s * 0.12, s * 0.12], [0, s * 0.2, 0], context.wood, [0, 0, 0], signature);
      break;
  }
  context.root.add(signature);
}

function addStyle(context: PropContext, archetype: WorldPropArchetype, style: WorldStyle): void {
  const group = resourceGroup(style.signaturePart);
  const s = archetype.size;
  if (style.ornament === "leaf") {
    group.add(resourceMesh(`${group.name}.leaf`, new THREE.SphereGeometry(s * 0.16, 9, 6), context.primary, [0, s * 0.62, s * 0.48], [0.35, 1.25, 0.15], [0, 0, -0.45]));
    group.add(resourceMesh(`${group.name}.vine`, new THREE.TorusGeometry(s * 0.25, s * 0.035, 6, 18), context.secondary, [0, s * 0.55, s * 0.42]));
  } else if (style.ornament === "sun") {
    group.add(resourceMesh(`${group.name}.disc`, new THREE.CylinderGeometry(s * 0.17, s * 0.17, s * 0.045, 12), context.accent, [0, s * 0.58, s * 0.48], [1, 1, 1], [Math.PI / 2, 0, 0]));
    for (let index = 0; index < 8; index += 1) group.add(resourceMesh(`${group.name}.ray.${index + 1}`, new THREE.ConeGeometry(s * 0.035, s * 0.18, 4), context.secondary, [Math.sin(index * Math.PI / 4) * s * 0.25, s * 0.58 + Math.cos(index * Math.PI / 4) * s * 0.25, s * 0.48], [1, 1, 1], [0, 0, index * -Math.PI / 4]));
  } else if (style.ornament === "rune") {
    group.add(resourceMesh(`${group.name}.stone`, new THREE.OctahedronGeometry(s * 0.22, 0), context.secondary, [0, s * 0.58, s * 0.45], [0.8, 1.3, 0.35]));
    box(context, `${group.name}.bar`, [s * 0.05, s * 0.36, s * 0.04], [0, s * 0.58, s * 0.54], context.accent, [0, 0, 0], group);
  } else {
    for (let index = 0; index < 3; index += 1) group.add(resourceMesh(`${group.name}.${index + 1}`, new THREE.OctahedronGeometry(s * (0.1 + index * 0.03), 0), context.glow, [(index - 1) * s * 0.22, s * (0.55 + Math.abs(index - 1) * -0.06), s * 0.48], [0.7, 1.5, 0.7]));
  }
  context.root.add(group);
}

export function createWorldPropResource(archetype: WorldPropArchetype, style: WorldStyle): THREE.Group {
  const context = createContext(archetype, style);
  addArchetype(context, archetype);
  addStyle(context, archetype, style);
  const sockets = {
    interaction: resourceSocket("socket.interaction", [0, archetype.size * 0.8, archetype.size * 0.8], context.root),
    effect: resourceSocket("socket.effect", [0, archetype.size * 1.2, 0], context.root),
    ground: resourceSocket("socket.ground", [0, 0, 0], context.root),
  };
  context.root.userData.resource = { id: context.root.name, type: "world", archetypeId: archetype.id, styleId: style.id, kind: archetype.kind, original: true, procedural: true, quality: "runtime-gallery", axis: { forward: "+Z", up: "+Y" }, dispose: "deep-geometry-and-materials" };
  annotateResourceTree(context.root, "world", context.root.name);
  context.root.userData.sculptRuntime = { nodes: collectResourceNodes(context.root), sockets, colliders: [context.structure], destructionGroups: { structure: [context.structure.name], interactive: context.root.children.filter((node) => node.userData.animationPivot).map((node) => node.name) } };
  return context.root;
}

export const disposeWorldPropResource = disposeResourceTree;
