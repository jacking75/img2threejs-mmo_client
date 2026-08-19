import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AvatarGroup, AvatarOptions, SculptRuntime } from "../types";
import { adaptImportedAvatar } from "./AvatarAdapter";
import { createAnimeAvatar } from "./createAnimeAvatar";

const FEMALE_WARRIOR_GLB = "/assets/characters/female-warrior.glb";

type ImportedAvatarLoader = () => Promise<Pick<GLTF, "scene" | "animations">>;

export function createRuntimeAvatar(
  options: AvatarOptions,
  loadImportedAvatar: ImportedAvatarLoader = loadFemaleWarriorGlb,
): AvatarGroup {
  const avatar = createAnimeAvatar(options);
  avatar.userData.assetSource = "procedural";
  avatar.userData.assetStatus = "ready";
  if (!isFemaleWarrior(options) || (typeof window === "undefined" && loadImportedAvatar === loadFemaleWarriorGlb)) {
    return avatar;
  }

  avatar.visible = false;
  avatar.userData.assetStatus = "loading";
  avatar.userData.assetReady = upgradeToFemaleWarriorGlb(avatar, loadImportedAvatar)
    .then(() => {
      avatar.userData.assetStatus = "ready";
      avatar.visible = !avatar.userData.disposed;
    })
    .catch((error: unknown) => {
      avatar.userData.assetError = error;
      avatar.userData.assetStatus = "fallback";
      avatar.visible = !avatar.userData.disposed;
    });
  return avatar;
}

export function applyImportedOutfit(avatar: AvatarGroup, outfitId: string): boolean {
  if (avatar.userData.assetSource !== "blender-glb") return false;
  let matched = false;
  avatar.traverse((node) => {
    const nodeOutfitId = getImportedOutfitId(node);
    if (!nodeOutfitId) return;
    node.visible = nodeOutfitId === outfitId;
    matched ||= node.visible;
  });
  return matched;
}

async function upgradeToFemaleWarriorGlb(
  avatar: AvatarGroup,
  loadImportedAvatar: ImportedAvatarLoader,
): Promise<void> {
  const gltf = await loadImportedAvatar();
  if (avatar.userData.disposed === true) {
    disposeObject(gltf.scene);
    return;
  }

  gltf.scene.name = "female-warrior.glb";
  let adapted;
  try {
    adapted = adaptImportedAvatar(gltf.scene, gltf.animations);
  } catch (error: unknown) {
    disposeObject(gltf.scene);
    throw error;
  }

  const previousRuntime = avatar.userData.sculptRuntime;
  const attachments = collectSocketAttachments(previousRuntime.sockets);
  attachments.forEach(({ object }) => object.removeFromParent());
  for (const child of [...avatar.children]) {
    child.removeFromParent();
    disposeObject(child);
  }

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
  attachments.forEach(({ socket, object }) => {
    if (socket === "hand.R" && object.name.startsWith("weapon.")) {
      object.rotation.set(0.08, 0, 0);
      object.position.set(0, -0.15, 0.08);
    }
    if (socket === "head" && object.name === "head.starter-cap") {
      object.position.set(0, -0.3, 0);
      object.scale.setScalar(0.9);
    }
    adapted.runtime.sockets[socket].add(object);
  });

  avatar.userData.sculptRuntime = adapted.runtime;
  avatar.userData.animationRuntime = adapted.animation;
  avatar.userData.assetSource = "blender-glb";
  avatar.userData.img2threejs = {
    pipeline: "blender-external-asset",
    pass: "female-warrior-glb-v2-anatomy",
    reference: "docs_working/reference/concepts/female-warrior-turnaround-v1.png",
    headUnits: 5,
  };
  applyImportedOutfit(
    avatar,
    avatar.userData.avatarOptions.outfitId ?? "outfit.warrior-starter",
  );
}

function loadFemaleWarriorGlb(): Promise<Pick<GLTF, "scene" | "animations">> {
  return new GLTFLoader().loadAsync(FEMALE_WARRIOR_GLB);
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

function isFemaleWarrior(options: AvatarOptions): boolean {
  return options.body === "feminine" && options.classId === "warrior";
}

function getImportedOutfitId(node: THREE.Object3D): string | null {
  if (typeof node.userData.outfitId === "string") return node.userData.outfitId;
  if (node.name === "outfit.traveler.coat") return "outfit.traveler";
  if (node.name.startsWith("outfit.warrior.")) return "outfit.warrior-starter";
  return null;
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
