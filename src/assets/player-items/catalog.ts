import { createPlayerItemResource } from "./createPlayerItemResource";
import type {
  AccessoryArchetype,
  HeadArchetype,
  OutfitArchetype,
  PlayerItemArchetype,
  PlayerItemCategory,
  PlayerItemDefinition,
  PlayerItemTheme,
  WeaponArchetype,
} from "./types";

interface NamedArchetype<T extends PlayerItemArchetype> {
  readonly id: T;
  readonly label: string;
  readonly tags: readonly string[];
}

const THEMES: readonly { readonly id: PlayerItemTheme; readonly label: string; readonly tags: readonly string[] }[] = [
  { id: "frontier", label: "개척단", tags: ["실용", "자연", "여행"] },
  { id: "royal", label: "왕실", tags: ["기사단", "금장", "정규군"] },
  { id: "moon", label: "월광", tags: ["마법", "은빛", "비전"] },
  { id: "infernal", label: "업화", tags: ["화염", "흑철", "고위험"] },
] as const;

export const weaponArchetypes: readonly NamedArchetype<WeaponArchetype>[] = [
  { id: "longsword", label: "장검", tags: ["한손", "검"] },
  { id: "greatsword", label: "대검", tags: ["양손", "중량"] },
  { id: "rapier", label: "레이피어", tags: ["찌르기", "결투"] },
  { id: "dagger", label: "단검", tags: ["암살", "경량"] },
  { id: "twinblade", label: "쌍날검", tags: ["양날", "곡예"] },
  { id: "battleaxe", label: "전투도끼", tags: ["도끼", "한손"] },
  { id: "greataxe", label: "대형도끼", tags: ["도끼", "양손"] },
  { id: "warhammer", label: "전쟁망치", tags: ["둔기", "한손"] },
  { id: "maul", label: "대형망치", tags: ["둔기", "양손"] },
  { id: "spear", label: "장창", tags: ["장병기", "찌르기"] },
  { id: "halberd", label: "할버드", tags: ["장병기", "도끼"] },
  { id: "glaive", label: "글레이브", tags: ["장병기", "베기"] },
  { id: "longbow", label: "장궁", tags: ["원거리", "활"] },
  { id: "staff", label: "마도 지팡이", tags: ["마법", "양손"] },
  { id: "wand", label: "마법봉", tags: ["마법", "한손"] },
  { id: "gauntlet", label: "전투 건틀릿", tags: ["격투", "근접"] },
  { id: "chakram", label: "차크람", tags: ["투척", "환형"] },
  { id: "scythe", label: "전투낫", tags: ["장병기", "곡날"] },
] as const;

export const outfitArchetypes: readonly NamedArchetype<OutfitArchetype>[] = [
  { id: "adventurer", label: "모험가 복장", tags: ["경갑", "여행"] },
  { id: "plate", label: "판금 갑옷", tags: ["중갑", "기사"] },
  { id: "chainmail", label: "사슬 갑옷", tags: ["중갑", "사슬"] },
  { id: "leather", label: "가죽 갑옷", tags: ["경갑", "기동"] },
  { id: "ranger", label: "레인저 복장", tags: ["경갑", "야외"] },
  { id: "mage", label: "마도사 로브", tags: ["천옷", "마법"] },
  { id: "priest", label: "사제 예복", tags: ["천옷", "신성"] },
  { id: "assassin", label: "암살자 복장", tags: ["경갑", "은신"] },
  { id: "noble", label: "귀족 예복", tags: ["예복", "사교"] },
  { id: "sailor", label: "선원 복장", tags: ["천옷", "항해"] },
  { id: "smith", label: "대장장이 작업복", tags: ["작업복", "제작"] },
  { id: "dragon", label: "용린 갑옷", tags: ["중갑", "용족"] },
] as const;

export const headArchetypes: readonly NamedArchetype<HeadArchetype>[] = [
  { id: "sallet", label: "샐릿 투구", tags: ["중갑", "바이저"] },
  { id: "greathelm", label: "대형 투구", tags: ["중갑", "전면보호"] },
  { id: "hood", label: "후드", tags: ["천", "은신"] },
  { id: "circlet", label: "서클릿", tags: ["장신구", "마법"] },
  { id: "witchhat", label: "마도 모자", tags: ["천", "마법"] },
  { id: "hornedhelm", label: "뿔 투구", tags: ["중갑", "야만"] },
] as const;

export const accessoryArchetypes: readonly NamedArchetype<AccessoryArchetype>[] = [
  { id: "roundshield", label: "원형 방패", tags: ["방패", "한손"] },
  { id: "towershield", label: "대형 방패", tags: ["방패", "중량"] },
  { id: "cape", label: "전투 망토", tags: ["등", "천"] },
  { id: "quiver", label: "화살통", tags: ["등", "궁술"] },
  { id: "spellbook", label: "마도서", tags: ["보조", "마법"] },
  { id: "lantern", label: "탐험 등불", tags: ["보조", "탐험"] },
] as const;

function makeDefinition(
  category: PlayerItemCategory,
  archetype: NamedArchetype<PlayerItemArchetype>,
  theme: (typeof THEMES)[number],
): PlayerItemDefinition {
  const definition: PlayerItemDefinition = {
    id: `player.${category}.${theme.id}-${archetype.id}`,
    label: `${theme.label} ${archetype.label}`,
    category,
    subtype: archetype.id,
    theme: theme.id,
    tags: [category, archetype.id, theme.id, ...archetype.tags, ...theme.tags],
    create: () => createPlayerItemResource(definition),
  };
  return Object.freeze(definition);
}

function buildCategory<T extends PlayerItemArchetype>(
  category: PlayerItemCategory,
  archetypes: readonly NamedArchetype<T>[],
): readonly PlayerItemDefinition[] {
  return archetypes.flatMap((archetype) => THEMES.map((theme) => makeDefinition(category, archetype, theme)));
}

export const playerWeaponResources = buildCategory("weapon", weaponArchetypes);
export const playerOutfitResources = buildCategory("outfit", outfitArchetypes);
export const playerHeadResources = buildCategory("head", headArchetypes);
export const playerAccessoryResources = buildCategory("accessory", accessoryArchetypes);

export const playerItemResources: readonly PlayerItemDefinition[] = Object.freeze([
  ...playerWeaponResources,
  ...playerOutfitResources,
  ...playerHeadResources,
  ...playerAccessoryResources,
]);

export const playerItemResourceById: ReadonlyMap<string, PlayerItemDefinition> = new Map(
  playerItemResources.map((definition) => [definition.id, definition]),
);
