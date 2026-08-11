import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { collectNamedNodes } from "../geometry";
import type { AvatarGroup, AvatarOptions, SculptRuntime } from "../types";
import { createAnimeAvatar } from "./createAnimeAvatar";

const FEMALE_WARRIOR_GLB = "/assets/characters/female-warrior.glb";

export function createRuntimeAvatar(options: AvatarOptions): AvatarGroup {
  const avatar = createAnimeAvatar(options);
  avatar.userData.assetSource = "procedural";
  if (!isFemaleWarrior(options) || typeof window === "undefined") return avatar;

  avatar.userData.assetReady = upgradeToFemaleWarriorGlb(avatar, options);
  return avatar;
}

export function applyImportedOutfit(avatar: AvatarGroup, outfitId: string): boolean {
  if (avatar.userData.assetSource !== "blender-glb") return false;
  let matched = false;
  avatar.traverse((node) => {
    const nodeOutfitId = node.userData.outfitId;
    if (typeof nodeOutfitId !== "string") return;
    node.visible = nodeOutfitId === outfitId;
    matched ||= node.visible;
  });
  return matched;
}

async function upgradeToFemaleWarriorGlb(avatar: AvatarGroup, options: AvatarOptions): Promise<void> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(FEMALE_WARRIOR_GLB);
  if (avatar.userData.disposed === true) {
    disposeObject(gltf.scene);
    return;
  }

  const previousRuntime = avatar.userData.sculptRuntime;
  const attachments = collectSocketAttachments(previousRuntime.sockets);
  attachments.forEach(({ object }) => object.removeFromParent());
  for (const child of [...avatar.children]) {
    child.removeFromParent();
    disposeObject(child);
  }

  gltf.scene.name = "female-warrior.glb";
  gltf.scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const normalizedName = node.name.toLowerCase().replaceAll(".", "").replaceAll("_", "");
    const isFaceOverlay = normalizedName.startsWith("face");
    const isFrontHair = normalizedName.startsWith("hairbang");
    node.castShadow = !isFaceOverlay && !isFrontHair;
    node.receiveShadow = true;
    node.frustumCulled = false;
  });
  avatar.add(gltf.scene);

  const nodes = collectNamedNodes(avatar);
  const chest = requiredImportedNode(nodes, "chest");
  const outfitRootMount = new THREE.Group();
  outfitRootMount.name = "outfit.mount.root";
  avatar.add(outfitRootMount);
  const outfitChestMount = new THREE.Group();
  outfitChestMount.name = "outfit.mount.chest";
  chest.add(outfitChestMount);

  const sockets = {
    "hand.R": createImportedSocket(requiredImportedNode(nodes, "hand.R"), "socket.hand.R", [0, 0.16, 0]),
    "hand.L": createImportedSocket(requiredImportedNode(nodes, "hand.L"), "socket.hand.L", [0, 0.16, 0]),
    head: createImportedSocket(requiredImportedNode(nodes, "head"), "socket.head", [0, 0.36, 0]),
    back: createImportedSocket(requiredImportedNode(nodes, "back"), "socket.back", [0, 0, 0]),
  };
  attachments.forEach(({ socket, object }) => {
    if (socket === "hand.R" && object.name.startsWith("weapon.")) {
      object.rotation.set(0.08, 0, 0);
      object.position.set(0, -0.15, 0.08);
    }
    sockets[socket].add(object);
  });

  const canonicalNodes = withCanonicalRigNames(collectNamedNodes(avatar));
  avatar.userData.sculptRuntime = {
    nodes: canonicalNodes,
    sockets,
    colliders: [requiredImportedNode(nodes, "body.continuous")],
    destructionGroups: {
      body: ["body.continuous", "head", "chest", "pelvis"],
      limbs: ["arm.L.upper", "arm.R.upper", "leg.L.upper", "leg.R.upper"],
      equipment: ["socket.hand.R", "socket.back"],
      hair: ["hair.crown-mass", "hair.rear-mass", "hair.ponytail.1"],
      outfit: ["outfit.mount.root", "outfit.mount.chest", "outfit.warrior.tunic"],
    },
  } satisfies SculptRuntime;
  avatar.userData.assetSource = "blender-glb";
  avatar.userData.img2threejs = {
    pipeline: "blender-external-asset",
    pass: "female-warrior-glb-v2-anatomy",
    reference: "docs_working/reference/concepts/female-warrior-turnaround-v1.png",
    headUnits: 5,
  };
  applyImportedOutfit(avatar, options.outfitId ?? "outfit.warrior-starter");
}

function collectSocketAttachments(
  sockets: SculptRuntime["sockets"],
): Array<{ readonly socket: keyof SculptRuntime["sockets"]; readonly object: THREE.Object3D }> {
  const attachments: Array<{ socket: keyof SculptRuntime["sockets"]; object: THREE.Object3D }> = [];
  for (const socket of Object.keys(sockets) as Array<keyof SculptRuntime["sockets"]>) {
    for (const child of sockets[socket].children) {
      if (child.userData.itemId !== undefined || /^(weapon\.|equipment\.|head\.)/.test(child.name)) {
        attachments.push({ socket, object: child });
      }
    }
  }
  return attachments;
}

function requiredImportedNode(
  nodes: Readonly<Record<string, THREE.Object3D>>,
  canonicalName: string,
): THREE.Object3D {
  const node = nodes[canonicalName]
    ?? nodes[canonicalName.replaceAll(".", "_")]
    ?? nodes[canonicalName.replaceAll(".", "")];
  if (!node) {
    throw new Error(`Imported female warrior node is missing: ${canonicalName}`);
  }
  return node;
}

function createImportedSocket(
  parent: THREE.Object3D,
  name: string,
  position: readonly [number, number, number],
): THREE.Group {
  const socket = new THREE.Group();
  socket.name = name;
  socket.position.fromArray(position);
  parent.add(socket);
  return socket;
}

function withCanonicalRigNames(
  nodes: Readonly<Record<string, THREE.Object3D>>,
): Readonly<Record<string, THREE.Object3D>> {
  const canonical = { ...nodes };
  for (const name of [
    "arm.L.upper",
    "arm.L.lower",
    "hand.L",
    "arm.R.upper",
    "arm.R.lower",
    "hand.R",
    "leg.L.upper",
    "leg.L.lower",
    "ankle.L",
    "leg.R.upper",
    "leg.R.lower",
    "ankle.R",
    "body.continuous",
  ]) {
    canonical[name] = requiredImportedNode(nodes, name);
  }
  return canonical;
}

function isFemaleWarrior(options: AvatarOptions): boolean {
  return options.body === "feminine" && options.classId === "warrior";
}

function disposeObject(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
