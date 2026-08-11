import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createAnimeAvatar } from "../../src/assets/avatar/createAnimeAvatar";
import { attachClassEquipmentPreview } from "../../src/dev/attachClassEquipmentPreview";

describe("createAnimeAvatar", () => {
  it.each([
    ["feminine", "warrior"],
    ["feminine", "mage"],
    ["feminine", "ranger"],
    ["masculine", "warrior"],
    ["masculine", "mage"],
    ["masculine", "ranger"],
  ] as const)("creates an action-ready %s %s avatar", (body, classId) => {
    const avatar = createAnimeAvatar({ body, classId });
    const runtime = avatar.userData.sculptRuntime;

    expect(avatar.name).toBe("root");
    expect(Object.keys(runtime.sockets).sort()).toEqual(["back", "hand.L", "hand.R", "head"]);
    expect(runtime.nodes["hand.R"]).toBe(runtime.sockets["hand.R"]);
    expect(runtime.destructionGroups.body).toContain("head");
    expect(runtime.sockets["hand.R"].children.some(({ name }) => name.startsWith("weapon."))).toBe(false);
    expect(runtime.sockets.back.children.some(({ name }) => name === "equipment.quiver")).toBe(false);
    expect(runtime.nodes["outfit.mount.root"]).toBeDefined();
    expect(runtime.nodes["outfit.mount.chest"]).toBeDefined();
    expect(avatar.userData.img2threejs.reference).toContain(`${body}-${classId}-turnaround-v1.png`);

    const hair = runtime.nodes.hair;
    expect(hair.userData.variant).toBe(`${body}.${classId}`);
    expect(hair.children.filter(({ userData }) => userData.proceduralPart === "tapered-ribbon").length).toBeGreaterThanOrEqual(5);

    const size = new Box3().setFromObject(avatar).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(4.7);
    expect(size.y).toBeLessThan(6.7);
    expect(size.z).toBeGreaterThan(0.6);
  });

  it.each([
    ["feminine", "warrior", "hair.ponytail.1", "outfit.warrior.pauldron"],
    ["feminine", "mage", "hair.braid.1", "outfit.mage.mantle"],
    ["feminine", "ranger", "hair.side-braid.1", "outfit.ranger.hood"],
    ["masculine", "warrior", "hair.spike.1", "outfit.warrior.pauldron"],
    ["masculine", "mage", "hair.spike.1", "outfit.mage.mantle"],
    ["masculine", "ranger", "hair.rear-tie.L", "outfit.ranger.hood"],
  ] as const)("preserves concept identifiers for %s %s", (body, classId, hairPart, outfitPart) => {
    const avatar = createAnimeAvatar({ body, classId });

    expect(avatar.getObjectByName(hairPart)).toBeDefined();
    expect(avatar.getObjectByName(outfitPart)).toBeDefined();
  });

  it("renders the shared traveler outfit without changing the socket contract", () => {
    const avatar = createAnimeAvatar({
      body: "feminine",
      classId: "warrior",
      outfitId: "outfit.traveler",
    });

    expect(avatar.getObjectByName("outfit.traveler.coat")).toBeDefined();
    expect(avatar.getObjectByName("outfit.warrior.tunic")).toBeUndefined();
    expect(avatar.userData.sculptRuntime.sockets["hand.R"]).toBeDefined();
  });

  it("uses the concept-matched hero construction only for the feminine warrior", () => {
    const hero = createAnimeAvatar({ body: "feminine", classId: "warrior" });
    const masculineWarrior = createAnimeAvatar({ body: "masculine", classId: "warrior" });
    const heroFace = hero.getObjectByName("face");
    const masculineFace = masculineWarrior.getObjectByName("face");

    expect(hero.userData.img2threejs.headUnits).toBe(5);
    expect((heroFace as { geometry?: { name?: string } }).geometry?.name).toBe("hero.feminine-warrior.head-volume");
    expect((masculineFace as { geometry?: { name?: string } }).geometry?.name).not.toBe("hero.feminine-warrior.head-volume");
    expect(hero.getObjectByName("hair.ponytail.7")).toBeDefined();
    expect(hero.getObjectByName("outfit.warrior.short-sleeve.L")).toBeDefined();
    expect(hero.getObjectByName("outfit.warrior.glove-bracer.R")).toBeDefined();
    expect(hero.getObjectByName("outfit.warrior.skirt-border.L")).toBeDefined();
    expect(masculineWarrior.getObjectByName("outfit.warrior.short-sleeve.L")).toBeUndefined();
  });

  it.each([
    ["warrior", "weapon.training-sword", undefined],
    ["mage", "weapon.mage-staff", undefined],
    ["ranger", "weapon.ranger-bow", "equipment.quiver"],
  ] as const)("attaches %s equipment only through the gallery preview adapter", (classId, handItem, backItem) => {
    const avatar = createAnimeAvatar({ body: "feminine", classId });
    const hand = avatar.userData.sculptRuntime.sockets["hand.R"];
    const back = avatar.userData.sculptRuntime.sockets.back;

    expect(hand.getObjectByName(handItem)).toBeUndefined();
    attachClassEquipmentPreview(avatar);
    expect(hand.getObjectByName(handItem)).toBeDefined();
    if (backItem) expect(back.getObjectByName(backItem)).toBeDefined();
  });
});
