import type { Mesh } from "three";
import { describe, expect, it, vi } from "vitest";
import { createAnimeAvatar } from "../../src/assets/avatar/createAnimeAvatar";
import { createDefaultProfile } from "../../src/domain/character";
import { equipOwnedItem } from "../../src/domain/equipment";
import { EquipmentRenderer } from "../../src/render/EquipmentRenderer";

describe("EquipmentRenderer", () => {
  it("attaches the equipped sword and head item to exact named sockets", () => {
    const profile = createDefaultProfile({ name: "별빛", body: "feminine", classId: "warrior" });
    const avatar = createAnimeAvatar({ body: profile.body, classId: profile.classId });
    const renderer = new EquipmentRenderer(avatar);

    renderer.sync(profile);

    const hand = avatar.userData.sculptRuntime.sockets["hand.R"];
    const head = avatar.userData.sculptRuntime.sockets.head;
    expect(renderer.getActiveVisual("weapon")?.parent).toBe(hand);
    expect(renderer.getActiveVisual("head")?.parent).toBe(head);
    expect(hand.getObjectByName("weapon.training-sword")).toBeDefined();
    expect(head.getObjectByName("head.none")).toBeDefined();
  });

  it("replaces and disposes a sword without leaving duplicate visuals", () => {
    const profile = createDefaultProfile({ name: "카인", body: "masculine", classId: "warrior" });
    const avatar = createAnimeAvatar({ body: profile.body, classId: profile.classId });
    const renderer = new EquipmentRenderer(avatar);
    renderer.sync(profile);
    const previousWeapon = renderer.getActiveVisual("weapon");
    const blade = previousWeapon?.getObjectByName("blade") as Mesh | undefined;
    const onDispose = vi.fn();
    blade?.geometry.addEventListener("dispose", onDispose);

    const result = equipOwnedItem(profile, "weapon.moon-sword");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    renderer.sync(result.profile);
    renderer.sync(result.profile);

    const hand = avatar.userData.sculptRuntime.sockets["hand.R"];
    expect(previousWeapon?.parent).toBeNull();
    expect(onDispose).toHaveBeenCalledOnce();
    expect(renderer.getActiveItemId("weapon")).toBe("weapon.moon-sword");
    expect(hand.children.filter(({ userData }) => userData.itemId !== undefined)).toHaveLength(1);
  });

  it("changes outfit mounts without recreating the avatar", () => {
    const profile = createDefaultProfile({ name: "루나", body: "feminine", classId: "mage" });
    const avatar = createAnimeAvatar({ body: profile.body, classId: profile.classId });
    const renderer = new EquipmentRenderer(avatar);
    renderer.sync(profile);
    const originalAvatar = avatar;
    const originalHead = avatar.userData.sculptRuntime.sockets.head;

    const result = equipOwnedItem(profile, "outfit.traveler");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    renderer.sync(result.profile);

    expect(avatar).toBe(originalAvatar);
    expect(avatar.userData.sculptRuntime.sockets.head).toBe(originalHead);
    expect(avatar.getObjectByName("outfit.traveler.coat")).toBeDefined();
    expect(avatar.getObjectByName("outfit.mage.bodice")).toBeUndefined();
  });

  it("switches the head slot through the same renderer path", () => {
    const profile = createDefaultProfile({ name: "레온", body: "masculine", classId: "ranger" });
    const avatar = createAnimeAvatar({ body: profile.body, classId: profile.classId });
    const renderer = new EquipmentRenderer(avatar);
    renderer.sync(profile);

    const capResult = equipOwnedItem(profile, "head.starter-cap");
    expect(capResult.ok).toBe(true);
    if (!capResult.ok) return;
    renderer.sync(capResult.profile);
    expect(avatar.getObjectByName("head.starter-cap.crown")).toBeDefined();

    const noneResult = equipOwnedItem(capResult.profile, "head.none");
    expect(noneResult.ok).toBe(true);
    if (!noneResult.ok) return;
    renderer.sync(noneResult.profile);
    expect(avatar.getObjectByName("head.starter-cap.crown")).toBeUndefined();
    expect(renderer.getActiveItemId("head")).toBe("head.none");
  });
});
