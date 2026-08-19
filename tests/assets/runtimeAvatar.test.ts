import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createRuntimeAvatar } from "../../src/assets/avatar/createRuntimeAvatar";
import { createDefaultProfile } from "../../src/domain/character";
import { equipOwnedItem } from "../../src/domain/equipment";
import { EquipmentRenderer } from "../../src/render/EquipmentRenderer";

describe("createRuntimeAvatar", () => {
  it("keeps the procedural avatar hidden until a validated GLB is ready", async () => {
    let resolveLoad!: (value: { scene: THREE.Group; animations: THREE.AnimationClip[] }) => void;
    const load = new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>((resolve) => {
      resolveLoad = resolve;
    });
    const avatar = createRuntimeAvatar(femaleWarriorOptions, () => load);

    expect(avatar.visible).toBe(false);
    expect(avatar.userData.assetStatus).toBe("loading");
    resolveLoad({ scene: createImportedScene(), animations: [] });
    await avatar.userData.assetReady;

    expect(avatar.visible).toBe(true);
    expect(avatar.userData.assetStatus).toBe("ready");
    expect(avatar.userData.assetSource).toBe("blender-glb");
    expect(avatar.userData.animationRuntime?.clipNames).toEqual([]);
  });

  it("reveals the intact procedural fallback when GLB loading fails", async () => {
    const avatar = createRuntimeAvatar(femaleWarriorOptions, async () => {
      throw new Error("network unavailable");
    });
    const proceduralHead = avatar.getObjectByName("head");

    expect(avatar.visible).toBe(false);
    await avatar.userData.assetReady;

    expect(avatar.visible).toBe(true);
    expect(avatar.userData.assetStatus).toBe("fallback");
    expect(avatar.userData.assetSource).toBe("procedural");
    expect(avatar.getObjectByName("head")).toBe(proceduralHead);
    expect(avatar.userData.assetError).toBeInstanceOf(Error);
  });

  it("keeps the procedural fallback intact when an imported rig is invalid", async () => {
    const invalidScene = createImportedScene();
    invalidScene.getObjectByName("head")?.removeFromParent();
    const avatar = createRuntimeAvatar(femaleWarriorOptions, async () => ({
      scene: invalidScene,
      animations: [],
    }));
    const proceduralHead = avatar.getObjectByName("head");

    await avatar.userData.assetReady;

    expect(avatar.userData.assetStatus).toBe("fallback");
    expect(avatar.userData.assetSource).toBe("procedural");
    expect(avatar.getObjectByName("head")).toBe(proceduralHead);
    expect(avatar.userData.assetError).toBeInstanceOf(Error);
  });

  it("uses the skinned imported traveler outfit and refits the starter cap", async () => {
    const base = createDefaultProfile({ name: "장비 검수", body: "feminine", classId: "warrior" });
    const traveler = equipOwnedItem(base, "outfit.traveler");
    expect(traveler.ok).toBe(true);
    if (!traveler.ok) return;
    const withCap = equipOwnedItem(traveler.profile, "head.starter-cap");
    expect(withCap.ok).toBe(true);
    if (!withCap.ok) return;
    const avatar = createRuntimeAvatar({
      body: withCap.profile.body,
      classId: withCap.profile.classId,
      outfitId: "outfit.traveler",
    }, async () => ({ scene: createImportedScene(), animations: [] }));
    const equipment = new EquipmentRenderer(avatar);
    equipment.sync(withCap.profile);

    await avatar.userData.assetReady;
    const tunic = avatar.getObjectByName("outfit.warrior.tunic") as THREE.Mesh;
    const importedTraveler = avatar.getObjectByName("outfit.traveler.coat");
    const cap = equipment.getActiveVisual("head");

    expect(importedTraveler?.userData.outfitId).toBe("outfit.traveler");
    expect(importedTraveler?.visible).toBe(true);
    expect(tunic.visible).toBe(false);
    expect(cap?.parent).toBe(avatar.userData.sculptRuntime.sockets.head);
    expect(cap?.position.y).toBeCloseTo(-0.3);
    expect(cap?.scale.x).toBeCloseTo(0.9);
  });
});

const femaleWarriorOptions = {
  body: "feminine",
  classId: "warrior",
} as const;

function createImportedScene(): THREE.Group {
  const scene = new THREE.Group();
  for (const name of [
    "chest",
    "head",
    "back",
    "pelvis",
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
    const node = new THREE.Group();
    node.name = name;
    scene.add(node);
  }
  const tunic = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x31527a }),
  );
  tunic.name = "outfit.warrior.tunic";
  tunic.userData.outfitId = "outfit.warrior-starter";
  scene.add(tunic);
  const traveler = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1.2, 1),
    new THREE.MeshStandardMaterial({ color: 0x3f6f78 }),
  );
  traveler.name = "outfit.traveler.coat";
  traveler.userData.outfitId = "outfit.traveler";
  scene.add(traveler);
  return scene;
}
