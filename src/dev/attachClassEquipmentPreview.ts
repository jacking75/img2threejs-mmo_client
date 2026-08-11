import { createMageStaff } from "../assets/equipment/createMageStaff";
import { createQuiver } from "../assets/equipment/createQuiver";
import { createRangerBow } from "../assets/equipment/createRangerBow";
import { createTrainingSword } from "../assets/equipment/createSword";
import type { AvatarGroup } from "../assets/types";

/** 개발용 갤러리에서만 클래스 대표 장비를 아바타 소켓에 부착한다. */
export function attachClassEquipmentPreview(avatar: AvatarGroup): AvatarGroup {
  const hand = avatar.userData.sculptRuntime.sockets["hand.R"];
  const back = avatar.userData.sculptRuntime.sockets.back;

  if (avatar.userData.avatarOptions.classId === "warrior") {
    const sword = createTrainingSword();
    sword.rotation.set(0.08, 0, Math.PI);
    sword.position.set(0, -0.15, 0.08);
    hand.add(sword);
  } else if (avatar.userData.avatarOptions.classId === "mage") {
    const staff = createMageStaff();
    staff.position.set(0, -0.02, 0);
    hand.add(staff);
  } else {
    const bow = createRangerBow();
    bow.rotation.z = -0.12;
    hand.add(bow);

    const quiver = createQuiver();
    quiver.position.set(0.32, -0.25, -0.18);
    quiver.rotation.z = -0.18;
    back.add(quiver);
  }

  return avatar;
}
