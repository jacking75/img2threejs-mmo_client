import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { adaptImportedAvatar, requiredImportedNode } from "../../src/assets/avatar/AvatarAdapter";

describe("AvatarAdapter", () => {
  it("normalizes imported node names and creates the canonical socket contract", () => {
    const scene = createImportedScene("underscore");
    const adapted = adaptImportedAvatar(scene, []);

    expect(adapted.runtime.nodes["arm.L.upper"]?.name).toBe("arm_L_upper");
    expect(adapted.runtime.sockets["hand.R"].name).toBe("socket.hand.R");
    expect(adapted.runtime.nodes["outfit.mount.root"]?.parent).toBe(scene);
    expect(adapted.runtime.nodes["outfit.mount.chest"]?.parent?.name).toBe("chest");
    expect(adapted.animation.clipNames).toEqual([]);
    expect(adapted.animation.update("idle", 0.016)).toBe(false);
  });

  it("maps common GLTF clip names while leaving missing states to procedural fallback", () => {
    const scene = createImportedScene("canonical");
    const clips = [
      new THREE.AnimationClip("Character_Idle", 1, []),
      new THREE.AnimationClip("Run", 1, []),
      new THREE.AnimationClip("Sword_Attack", 0.7, []),
    ];
    const { animation } = adaptImportedAvatar(scene, clips);

    expect(animation.update("idle", 0.016)).toBe(true);
    expect(animation.update("run", 0.016)).toBe(true);
    expect(animation.update("attack_1", 0.016)).toBe(true);
    expect(animation.update("sprint", 0.016)).toBe(false);
    animation.dispose();
  });

  it("reports a missing canonical node before an imported avatar is activated", () => {
    expect(() => requiredImportedNode({}, "head")).toThrow("Imported avatar node is missing: head");
  });

  it("accepts caller-provided aliases for DCC-specific bone names", () => {
    const scene = createImportedScene("canonical");
    const head = scene.getObjectByName("head");
    if (!head) throw new Error("test head is missing");
    head.name = "mixamorigHead";

    const adapted = adaptImportedAvatar(scene, [], {
      nodeAliases: { head: ["mixamorigHead"] },
    });

    expect(adapted.runtime.nodes.head).toBe(head);
    expect(adapted.runtime.sockets.head.parent).toBe(head);
  });
});

function createImportedScene(style: "canonical" | "underscore"): THREE.Group {
  const scene = new THREE.Group();
  const names = [
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
  ];
  for (const name of names) {
    const node = new THREE.Group();
    node.name = style === "underscore" ? name.replaceAll(".", "_") : name;
    scene.add(node);
  }
  return scene;
}
