import { createCreatureResource } from "./createCreatureResource";
import type { CreatureAffinity, CreatureArchetype, CreatureResourceDefinition } from "./types";

export const CREATURE_AFFINITIES = [
  { id: "verdant", label: "녹음", primary: 0x426f4d, secondary: 0xa2b96a, glow: 0x80e58d, signaturePart: "affinity.verdant.vine-crown", tags: ["자연", "독"] },
  { id: "ember", label: "화염", primary: 0x773b2b, secondary: 0xd3723d, glow: 0xffbd55, signaturePart: "affinity.ember.flame-spines", tags: ["화염", "용암"] },
  { id: "frost", label: "빙결", primary: 0x466779, secondary: 0x9dcad0, glow: 0xcdf6ff, signaturePart: "affinity.frost.ice-crown", tags: ["냉기", "설원"] },
  { id: "void", label: "공허", primary: 0x3c3156, secondary: 0x825c9c, glow: 0xe892ff, signaturePart: "affinity.void.orbit-runes", tags: ["암흑", "마법"] },
] as const satisfies readonly CreatureAffinity[];

export const CREATURE_ARCHETYPES = [
  { id: "slime", label: "슬라임", bodyPlan: "blob", size: 0.72, signature: "tentacles", tags: ["초원", "하급"] },
  { id: "giant-rat", label: "거대쥐", bodyPlan: "quadruped", size: 0.64, signature: "fangs", tags: ["하수도", "야수"] },
  { id: "giant-bat", label: "거대박쥐", bodyPlan: "flying", size: 0.78, signature: "bat-wings", tags: ["동굴", "비행"] },
  { id: "cave-spider", label: "동굴거미", bodyPlan: "insect", size: 0.75, signature: "fangs", tags: ["동굴", "곤충"] },
  { id: "dune-scorpion", label: "사막전갈", bodyPlan: "insect", size: 0.92, signature: "claws", tags: ["사막", "곤충"] },
  { id: "mushroomling", label: "버섯정령", bodyPlan: "biped", size: 0.72, signature: "mushroom-cap", tags: ["숲", "정령"] },
  { id: "treant-sapling", label: "나무정령 묘목", bodyPlan: "biped", size: 1.08, signature: "roots", tags: ["숲", "정령"] },
  { id: "goblin-hound", label: "고블린 사냥개", bodyPlan: "quadruped", size: 0.84, signature: "jaws", tags: ["야영지", "야수"] },
  { id: "kobold", label: "코볼트", bodyPlan: "biped", size: 0.78, signature: "shield", tags: ["광산", "인간형"] },
  { id: "imp", label: "임프", bodyPlan: "flying", size: 0.72, signature: "bat-wings", tags: ["지옥", "비행"] },
  { id: "wisp", label: "도깨비불", bodyPlan: "blob", size: 0.62, signature: "crystal", tags: ["유적", "정령"] },
  { id: "mimic", label: "미믹", bodyPlan: "construct", size: 0.88, signature: "jaws", tags: ["던전", "보물"] },
  { id: "bone-hound", label: "뼈사냥개", bodyPlan: "quadruped", size: 0.92, signature: "skull", tags: ["묘지", "언데드"] },
  { id: "magma-crab", label: "용암게", bodyPlan: "insect", size: 0.94, signature: "claws", tags: ["화산", "갑각류"] },
  { id: "ice-elemental", label: "빙결정령", bodyPlan: "construct", size: 1.2, signature: "crystal", tags: ["설원", "정령"] },
  { id: "sand-crawler", label: "모래잠복자", bodyPlan: "insect", size: 1.02, signature: "shell", tags: ["사막", "곤충"] },
  { id: "bog-lurker", label: "늪지잠복자", bodyPlan: "blob", size: 1.02, signature: "tentacles", tags: ["습지", "괴수"] },
  { id: "harpy", label: "하피", bodyPlan: "flying", size: 1.05, signature: "wings", tags: ["절벽", "비행"] },
  { id: "griffin-cub", label: "그리핀 새끼", bodyPlan: "quadruped", size: 0.98, signature: "wings", tags: ["산악", "환수"] },
  { id: "drake-hatchling", label: "드레이크 새끼", bodyPlan: "quadruped", size: 1.08, signature: "wings", tags: ["산악", "용족"] },
  { id: "wyvern", label: "와이번", bodyPlan: "flying", size: 1.35, signature: "bat-wings", tags: ["산악", "용족"] },
  { id: "basilisk", label: "바실리스크", bodyPlan: "quadruped", size: 1.16, signature: "fangs", tags: ["유적", "파충류"] },
  { id: "rune-golem", label: "룬 골렘", bodyPlan: "construct", size: 1.45, signature: "crystal", tags: ["유적", "골렘"] },
  { id: "spectral-wolf", label: "유령늑대", bodyPlan: "quadruped", size: 1.04, signature: "skull", tags: ["묘지", "영체"] },
] as const satisfies readonly CreatureArchetype[];

export const CREATURE_RESOURCE_CATALOG: readonly CreatureResourceDefinition[] = CREATURE_ARCHETYPES.flatMap((archetype) =>
  CREATURE_AFFINITIES.map((affinity) => ({
    id: `creature.${affinity.id}.${archetype.id}`,
    label: `${affinity.label} ${archetype.label}`,
    category: "creature" as const,
    archetypeId: archetype.id,
    affinityId: affinity.id,
    tags: ["몬스터", "creature", archetype.id, affinity.id, ...archetype.tags, ...affinity.tags],
    signatureParts: [`creature.${archetype.id}.${archetype.signature}`, affinity.signaturePart],
    create: () => createCreatureResource(archetype, affinity),
  })),
);
