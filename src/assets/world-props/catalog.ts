import { createWorldPropResource } from "./createWorldPropResource";
import type { WorldPropArchetype, WorldPropResourceDefinition, WorldStyle } from "./types";

export const WORLD_STYLES = [
  { id: "greenward", label: "녹음 변경", primary: 0x516e43, secondary: 0x765331, accent: 0xc2a866, ornament: "leaf", signaturePart: "style.greenward.leaf-emblem", tags: ["숲", "자연"] },
  { id: "sunreach", label: "태양 사막", primary: 0xa65f35, secondary: 0xd8b76e, accent: 0x58a6a3, ornament: "sun", signaturePart: "style.sunreach.sun-emblem", tags: ["사막", "태양"] },
  { id: "frostmarch", label: "설원 변경", primary: 0x58778b, secondary: 0xb9c9ce, accent: 0x9074b4, ornament: "rune", signaturePart: "style.frostmarch.rune-emblem", tags: ["설원", "룬"] },
  { id: "arcane", label: "비전 왕국", primary: 0x43556f, secondary: 0x72518f, accent: 0x8de1d2, ornament: "crystal", signaturePart: "style.arcane.crystal-emblem", tags: ["마법", "도시"] },
] as const satisfies readonly WorldStyle[];

export const WORLD_PROP_ARCHETYPES = [
  { id: "market-stall", label: "시장 가판대", kind: "structure", size: 1.1, signaturePart: "world.market-stall.awning", tags: ["시장", "상점"] },
  { id: "merchant-wagon", label: "상단 마차", kind: "transport", size: 1.25, signaturePart: "world.merchant-wagon.cargo", tags: ["운송", "상단"] },
  { id: "treasure-chest", label: "보물 상자", kind: "mechanism", size: 0.72, signaturePart: "world.treasure-chest.lid-pivot", tags: ["던전", "보물"] },
  { id: "barrel-rack", label: "통 보관대", kind: "furniture", size: 0.9, signaturePart: "world.barrel-rack.barrels", tags: ["창고", "보관"] },
  { id: "adventurer-tent", label: "모험가 천막", kind: "camp", size: 1.2, signaturePart: "world.adventurer-tent.flysheet", tags: ["야영", "천막"] },
  { id: "roadside-shrine", label: "길가 제단", kind: "monument", size: 0.95, signaturePart: "world.roadside-shrine.idol", tags: ["신앙", "제단"] },
  { id: "village-fountain", label: "마을 분수", kind: "monument", size: 1.05, signaturePart: "world.village-fountain.water-bowl", tags: ["마을", "물"] },
  { id: "tavern-bench", label: "선술집 긴의자", kind: "furniture", size: 0.86, signaturePart: "world.tavern-bench.backrest", tags: ["선술집", "가구"] },
  { id: "street-lamp", label: "거리 가로등", kind: "structure", size: 0.84, signaturePart: "world.street-lamp.lantern", tags: ["도시", "조명"] },
  { id: "signpost", label: "방향 표지판", kind: "structure", size: 0.8, signaturePart: "world.signpost.arrows", tags: ["도로", "안내"] },
  { id: "bridge-segment", label: "목교 구간", kind: "structure", size: 1.2, signaturePart: "world.bridge-segment.ropes", tags: ["도로", "다리"] },
  { id: "fence-gate", label: "목책 대문", kind: "mechanism", size: 1.0, signaturePart: "world.fence-gate.hinge-pivot", tags: ["마을", "문"] },
  { id: "village-well", label: "마을 우물", kind: "mechanism", size: 1.0, signaturePart: "world.village-well.crank", tags: ["마을", "물"] },
  { id: "campfire", label: "야영 모닥불", kind: "camp", size: 0.62, signaturePart: "world.campfire.flames", tags: ["야영", "불"] },
  { id: "anvil-station", label: "야외 모루", kind: "craft", size: 0.74, signaturePart: "world.anvil-station.anvil", tags: ["제작", "대장간"] },
  { id: "alchemy-table", label: "연금술 작업대", kind: "craft", size: 0.88, signaturePart: "world.alchemy-table.glassware", tags: ["제작", "연금술"] },
  { id: "cooking-station", label: "야외 취사대", kind: "craft", size: 0.84, signaturePart: "world.cooking-station.cauldron", tags: ["제작", "요리"] },
  { id: "stable-stall", label: "마구간 칸막이", kind: "structure", size: 1.1, signaturePart: "world.stable-stall.feed-trough", tags: ["마구간", "가축"] },
  { id: "dock-crane", label: "부두 기중기", kind: "mechanism", size: 1.25, signaturePart: "world.dock-crane.boom-pivot", tags: ["항구", "기계"] },
  { id: "fishing-boat", label: "소형 어선", kind: "transport", size: 1.3, signaturePart: "world.fishing-boat.hull", tags: ["항구", "선박"] },
  { id: "watchtower", label: "경계 망루", kind: "structure", size: 1.35, signaturePart: "world.watchtower.platform", tags: ["군사", "방어"] },
  { id: "siege-ballista", label: "공성 발리스타", kind: "mechanism", size: 1.15, signaturePart: "world.siege-ballista.arm-pivot", tags: ["군사", "공성"] },
  { id: "arcane-portal", label: "비전 차원문", kind: "monument", size: 1.1, signaturePart: "world.arcane-portal.ring", tags: ["마법", "이동"] },
  { id: "training-dummy", label: "훈련용 허수아비", kind: "mechanism", size: 0.9, signaturePart: "world.training-dummy.target-pivot", tags: ["훈련", "전투"] },
] as const satisfies readonly WorldPropArchetype[];

export const WORLD_PROP_RESOURCE_CATALOG: readonly WorldPropResourceDefinition[] = WORLD_PROP_ARCHETYPES.flatMap((archetype) =>
  WORLD_STYLES.map((style) => ({
    id: `world.${style.id}.${archetype.id}`,
    label: `${style.label} ${archetype.label}`,
    category: "world" as const,
    archetypeId: archetype.id,
    styleId: style.id,
    tags: ["월드", "소품", "world", archetype.id, style.id, archetype.kind, ...archetype.tags, ...style.tags],
    signatureParts: [archetype.signaturePart, style.signaturePart],
    create: () => createWorldPropResource(archetype, style),
  })),
);
