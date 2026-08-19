import { createNpcResource } from "./createNpcResource";
import type { NpcArchetype, NpcFaction, NpcResourceDefinition } from "./types";

export const NPC_FACTIONS = [
  { id: "greenward", label: "녹음 변경", primary: 0x426b4d, secondary: 0xd7c99b, accent: 0xb98945, motif: "leaf" },
  { id: "sunreach", label: "태양 사막", primary: 0x9b4f32, secondary: 0xf0cf86, accent: 0x56a5a3, motif: "sun" },
  { id: "frostmarch", label: "설원 변경", primary: 0x3f6680, secondary: 0xd6e7e8, accent: 0x9b79bd, motif: "rune" },
] as const satisfies readonly NpcFaction[];

export const NPC_ARCHETYPES = [
  { id: "merchant", label: "행상인", body: "feminine", classId: "ranger", signatureParts: ["npc.role.merchant.scale", "npc.role.merchant.trade-pack"], tags: ["town", "trade"] },
  { id: "blacksmith", label: "대장장이", body: "masculine", classId: "warrior", signatureParts: ["npc.role.blacksmith.hammer", "npc.role.blacksmith.forge-apron"], tags: ["town", "craft"] },
  { id: "guard", label: "성문 경비", body: "masculine", classId: "warrior", signatureParts: ["npc.role.guard.spear", "npc.role.guard.tower-shield"], tags: ["town", "military"] },
  { id: "noble", label: "지방 귀족", body: "feminine", classId: "mage", signatureParts: ["npc.role.noble.circlet", "npc.role.noble.fan"], tags: ["court", "social"] },
  { id: "farmer", label: "농부", body: "masculine", classId: "ranger", signatureParts: ["npc.role.farmer.straw-hat", "npc.role.farmer.pitchfork"], tags: ["village", "gathering"] },
  { id: "miner", label: "광부", body: "masculine", classId: "warrior", signatureParts: ["npc.role.miner.lamp-helmet", "npc.role.miner.pickaxe"], tags: ["mine", "gathering"] },
  { id: "sailor", label: "선원", body: "feminine", classId: "ranger", signatureParts: ["npc.role.sailor.cap", "npc.role.sailor.telescope"], tags: ["port", "travel"] },
  { id: "scholar", label: "왕립 학자", body: "masculine", classId: "mage", signatureParts: ["npc.role.scholar.mortarboard", "npc.role.scholar.scroll"], tags: ["academy", "lore"] },
  { id: "cleric", label: "성직자", body: "feminine", classId: "mage", signatureParts: ["npc.role.cleric.mitre", "npc.role.cleric.crozier"], tags: ["temple", "service"] },
  { id: "alchemist", label: "연금술사", body: "feminine", classId: "mage", signatureParts: ["npc.role.alchemist.goggles", "npc.role.alchemist.flask"], tags: ["town", "craft"] },
  { id: "bard", label: "음유시인", body: "masculine", classId: "ranger", signatureParts: ["npc.role.bard.feather-cap", "npc.role.bard.lute"], tags: ["tavern", "entertainment"] },
  { id: "healer", label: "약초 치유사", body: "feminine", classId: "mage", signatureParts: ["npc.role.healer.herb-wreath", "npc.role.healer.healing-staff"], tags: ["village", "service"] },
  { id: "hunter", label: "야생 사냥꾼", body: "masculine", classId: "ranger", signatureParts: ["npc.role.hunter.antler-hood", "npc.role.hunter.longbow"], tags: ["wild", "ranged"] },
  { id: "guild-receptionist", label: "길드 접수원", body: "feminine", classId: "warrior", signatureParts: ["npc.role.guild-receptionist.beret", "npc.role.guild-receptionist.ledger"], tags: ["guild", "service"] },
  { id: "cook", label: "여관 요리사", body: "masculine", classId: "warrior", signatureParts: ["npc.role.cook.toque", "npc.role.cook.pan"], tags: ["tavern", "service"] },
  { id: "fisher", label: "어부", body: "feminine", classId: "ranger", signatureParts: ["npc.role.fisher.rain-hat", "npc.role.fisher.rod"], tags: ["coast", "gathering"] },
  { id: "stable-keeper", label: "마구간지기", body: "masculine", classId: "ranger", signatureParts: ["npc.role.stable-keeper.flat-cap", "npc.role.stable-keeper.grooming-brush"], tags: ["village", "service"] },
  { id: "librarian", label: "마도 사서", body: "feminine", classId: "mage", signatureParts: ["npc.role.librarian.spectacles", "npc.role.librarian.open-book"], tags: ["academy", "lore"] },
  { id: "monk", label: "순례 수도사", body: "masculine", classId: "mage", signatureParts: ["npc.role.monk.prayer-beads", "npc.role.monk.pilgrim-staff"], tags: ["temple", "travel"] },
  { id: "desert-nomad", label: "사막 유목민", body: "feminine", classId: "ranger", signatureParts: ["npc.role.desert-nomad.turban", "npc.role.desert-nomad.scimitar"], tags: ["desert", "travel"] },
  { id: "northern-warrior", label: "북방 전사", body: "masculine", classId: "warrior", signatureParts: ["npc.role.northern-warrior.horned-helm", "npc.role.northern-warrior.battle-axe"], tags: ["north", "military"] },
  { id: "elven-artisan", label: "엘프 세공사", body: "feminine", classId: "mage", signatureParts: ["npc.role.elven-artisan.ears", "npc.role.elven-artisan.chisel"], tags: ["elf", "craft"] },
  { id: "dwarf-engineer", label: "드워프 기술자", body: "masculine", classId: "warrior", signatureParts: ["npc.role.dwarf-engineer.goggles", "npc.role.dwarf-engineer.wrench"], tags: ["dwarf", "craft"] },
  { id: "beastfolk-scout", label: "수인 정찰병", body: "feminine", classId: "ranger", signatureParts: ["npc.role.beastfolk-scout.ears", "npc.role.beastfolk-scout.tail"], tags: ["beastfolk", "wild"] },
] as const satisfies readonly NpcArchetype[];

export const NPC_RESOURCE_CATALOG: readonly NpcResourceDefinition[] = NPC_ARCHETYPES.flatMap((archetype) =>
  NPC_FACTIONS.map((faction) => ({
    id: `npc.${faction.id}.${archetype.id}`,
    label: `${faction.label} ${archetype.label}`,
    category: "npc" as const,
    archetypeId: archetype.id,
    factionId: faction.id,
    tags: ["npc", faction.id, archetype.id, ...archetype.tags],
    signatureParts: archetype.signatureParts,
    create: () => createNpcResource(archetype, faction),
  })),
);

export function getNpcResourceDefinition(id: string): NpcResourceDefinition | undefined {
  return NPC_RESOURCE_CATALOG.find((definition) => definition.id === id);
}
