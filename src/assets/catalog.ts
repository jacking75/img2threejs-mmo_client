import { createRuntimeAvatar } from "./avatar/createRuntimeAvatar";
import { createMageStaff } from "./equipment/createMageStaff";
import { createQuiver } from "./equipment/createQuiver";
import { createRangerBow } from "./equipment/createRangerBow";
import { createMoonSword, createTrainingSword } from "./equipment/createSword";
import { createFantasyTree, createGrassTuft, createRockCluster, createWaystone } from "./field/createFieldProps";
import type { AssetDefinition, BodyPresentation, CharacterClass } from "./types";

const bodyLabels: Record<BodyPresentation, string> = { feminine: "여성형", masculine: "남성형" };
const classLabels: Record<CharacterClass, string> = { warrior: "전사", mage: "마법사", ranger: "레인저" };

export const avatarAssets: readonly AssetDefinition[] = (["feminine", "masculine"] as const).flatMap((body) =>
  (["warrior", "mage", "ranger"] as const).map((classId) => ({
    id: `avatar.${body}.${classId}`,
    label: `${bodyLabels[body]} ${classLabels[classId]}`,
    category: "avatar" as const,
    create: () => createRuntimeAvatar({ body, classId }),
  })),
);

export const equipmentAssets: readonly AssetDefinition[] = [
  { id: "weapon.training-sword", label: "연습용 검", category: "weapon", create: createTrainingSword },
  { id: "weapon.moon-sword", label: "월광검", category: "weapon", create: createMoonSword },
  { id: "weapon.mage-staff", label: "수정 지팡이", category: "weapon", create: createMageStaff },
  { id: "weapon.ranger-bow", label: "리커브 보우", category: "weapon", create: createRangerBow },
  { id: "equipment.quiver", label: "가죽 화살통", category: "equipment", create: createQuiver },
];

export const fieldAssets: readonly AssetDefinition[] = [
  { id: "field.fantasy-tree", label: "판타지 나무", category: "field", create: createFantasyTree },
  { id: "field.rock-cluster", label: "바위 군락", category: "field", create: createRockCluster },
  { id: "field.grass-tuft", label: "풀 포기", category: "field", create: createGrassTuft },
  { id: "field.waystone", label: "룬 이정표", category: "field", create: createWaystone },
];

export const assetCatalog: readonly AssetDefinition[] = [...avatarAssets, ...equipmentAssets, ...fieldAssets];
