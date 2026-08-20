import type { AssetDefinition } from "../../assets/types";

export interface ResourceOwnership {
  readonly sourceFiles: readonly string[];
  readonly focusedTests: readonly string[];
  readonly sharedImpact: string;
}

const CATEGORY_OWNERSHIP: Readonly<Record<AssetDefinition["category"], ResourceOwnership>> = {
  avatar: {
    sourceFiles: ["src/assets/avatar/createAnimeAvatar.ts", "src/assets/avatar/createRuntimeAvatar.ts"],
    focusedTests: ["tests/assets/avatar.test.ts", "tests/assets/runtimeAvatar.test.ts"],
    sharedImpact: "같은 체형·클래스 조합을 사용하는 아바타에 영향을 줄 수 있다.",
  },
  npc: {
    sourceFiles: ["src/assets/npc/createNpcResource.ts", "src/assets/npc/catalog.ts"],
    focusedTests: ["tests/assets/npcResources.test.ts"],
    sharedImpact: "같은 NPC archetype과 세력 변형에 영향을 줄 수 있다.",
  },
  fauna: {
    sourceFiles: ["src/assets/fauna/createFaunaResource.ts", "src/assets/fauna/catalog.ts"],
    focusedTests: ["tests/assets/faunaResources.test.ts"],
    sharedImpact: "같은 동물 archetype의 네 가지 생태 변형에 영향을 줄 수 있다.",
  },
  creature: {
    sourceFiles: ["src/assets/creatures/createCreatureResource.ts", "src/assets/creatures/catalog.ts"],
    focusedTests: ["tests/assets/creatureResources.test.ts"],
    sharedImpact: "같은 몬스터 archetype의 팔레트·크기 변형에 영향을 줄 수 있다.",
  },
  world: {
    sourceFiles: ["src/assets/world-props/createWorldPropResource.ts", "src/assets/world-props/catalog.ts"],
    focusedTests: ["tests/assets/worldPropResources.test.ts"],
    sharedImpact: "같은 월드 소품 archetype의 지역 변형에 영향을 줄 수 있다.",
  },
  field: {
    sourceFiles: ["src/assets/field/createFieldProps.ts"],
    focusedTests: ["tests/render/createField.test.ts"],
    sharedImpact: "필드 런타임과 갤러리 미리보기에 함께 영향을 준다.",
  },
  weapon: {
    sourceFiles: ["src/assets/player-items/createPlayerItemResource.ts", "src/assets/equipment/createSword.ts"],
    focusedTests: ["tests/assets/playerItemResources.test.ts", "tests/assets/equipment.test.ts"],
    sharedImpact: "같은 무기 archetype의 품질 변형과 게임 장비에 영향을 줄 수 있다.",
  },
  outfit: {
    sourceFiles: ["src/assets/player-items/createPlayerItemResource.ts"],
    focusedTests: ["tests/assets/playerItemResources.test.ts"],
    sharedImpact: "같은 의상 archetype의 품질 변형에 영향을 줄 수 있다.",
  },
  head: {
    sourceFiles: ["src/assets/player-items/createPlayerItemResource.ts", "src/assets/equipment/createHeadEquipment.ts"],
    focusedTests: ["tests/assets/playerItemResources.test.ts", "tests/assets/equipment.test.ts"],
    sharedImpact: "같은 머리 장비 계열과 게임 장비에 영향을 줄 수 있다.",
  },
  accessory: {
    sourceFiles: ["src/assets/player-items/createPlayerItemResource.ts"],
    focusedTests: ["tests/assets/playerItemResources.test.ts"],
    sharedImpact: "같은 보조 장비 archetype 변형에 영향을 줄 수 있다.",
  },
  equipment: {
    sourceFiles: ["src/assets/equipment/createQuiver.ts"],
    focusedTests: ["tests/assets/equipment.test.ts"],
    sharedImpact: "갤러리와 클래스 장비 미리보기에 함께 영향을 줄 수 있다.",
  },
};

const LEGACY_SOURCE_FILES: Readonly<Record<string, readonly string[]>> = {
  "weapon.training-sword": ["src/assets/equipment/createSword.ts"],
  "weapon.moon-sword": ["src/assets/equipment/createSword.ts"],
  "weapon.mage-staff": ["src/assets/equipment/createMageStaff.ts"],
  "weapon.ranger-bow": ["src/assets/equipment/createRangerBow.ts"],
  "equipment.quiver": ["src/assets/equipment/createQuiver.ts"],
};

export function getResourceOwnership(definition: AssetDefinition): ResourceOwnership {
  const base = CATEGORY_OWNERSHIP[definition.category];
  const legacySource = LEGACY_SOURCE_FILES[definition.id];
  return legacySource ? { ...base, sourceFiles: legacySource } : base;
}

export function getStablePartKey(nodePath: readonly string[], explicitPartKey?: unknown): string {
  if (typeof explicitPartKey === "string" && explicitPartKey.trim()) return explicitPartKey;
  return nodePath.join("/");
}
