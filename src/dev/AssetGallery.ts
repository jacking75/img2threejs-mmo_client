import { assetCatalog, avatarAssets, creatureAssets, equipmentAssets, faunaAssets, fieldAssets, npcAssets, worldPropAssets } from "../assets/catalog";
import type { AssetDefinition } from "../assets/types";
import { AssetViewport } from "./shared/AssetViewport";

const ITEM_CATEGORIES = new Set<AssetDefinition["category"]>(["weapon", "outfit", "head", "accessory", "equipment"]);

function isCharacterAsset(definition: AssetDefinition): boolean {
  return definition.category === "avatar" || definition.category === "npc";
}

export function startAssetGallery(): void {
  const appNode = document.querySelector<HTMLElement>("#app");
  if (!appNode) throw new Error("#app root is missing");
  const app: HTMLElement = appNode;

  app.innerHTML = `
    <section class="atelier" aria-label="MMORPG 리소스 갤러리">
      <header class="brand">
        <p class="eyebrow">IMG2THREEJS · ASSET ATELIER</p>
        <h1>대륙 리소스 도감</h1>
        <p>동물 208종, 몬스터 96종, 월드 소품 96종을 포함한 절차형 MMORPG 리소스 655종이다.</p>
      </header>
      <div class="viewport-wrap">
        <canvas class="viewport" aria-label="선택한 3D 리소스 미리보기"></canvas>
        <div class="view-hint">드래그 회전 · 휠 확대</div>
        <div class="asset-badge"><span id="asset-kind">CHARACTER</span><strong id="asset-name">여성형 전사</strong></div>
      </div>
      <aside class="catalog-panel">
        <div class="tabs" role="tablist" aria-label="리소스 종류">
          <button class="tab is-active" data-category="avatar" type="button">캐릭터 <small>${String(avatarAssets.length).padStart(2, "0")}</small></button>
          <button class="tab" data-category="npc" type="button">NPC <small>${String(npcAssets.length).padStart(2, "0")}</small></button>
          <button class="tab" data-category="fauna" type="button">동물 <small>${faunaAssets.length}</small></button>
          <button class="tab" data-category="creature" type="button">몬스터 <small>${creatureAssets.length}</small></button>
          <button class="tab" data-category="equipment" type="button">아이템 <small>${equipmentAssets.length}</small></button>
          <button class="tab" data-category="world" type="button">월드 <small>${worldPropAssets.length + fieldAssets.length}</small></button>
        </div>
        <label class="catalog-search">
          <span>리소스 검색</span>
          <input id="asset-search" type="search" placeholder="이름, ID, 태그" autocomplete="off">
        </label>
        <div id="asset-list" class="asset-list"></div>
        <footer>
          <span><i class="dot dot-blue"></i> ORIGINAL PROCEDURAL</span>
          <span><i class="dot dot-gold"></i> ACTION READY</span>
        </footer>
      </aside>
    </section>
  `;

  function requiredElement<T extends Element>(selector: string): T {
    const element = app.querySelector<T>(selector);
    if (!element) throw new Error(`Gallery element is missing: ${selector}`);
    return element;
  }

  const viewportWrap = requiredElement<HTMLElement>(".viewport-wrap");
  const list = requiredElement<HTMLElement>("#asset-list");
  const search = requiredElement<HTMLInputElement>("#asset-search");
  const assetName = requiredElement<HTMLElement>("#asset-name");
  const assetKind = requiredElement<HTMLElement>("#asset-kind");
  const viewport = new AssetViewport({
    canvas: requiredElement<HTMLCanvasElement>("canvas"),
    container: viewportWrap,
    autoMotion: true,
  });

  function showAsset(definition: AssetDefinition): void {
    viewport.showAsset(definition);
    assetName.textContent = definition.label;
    assetKind.textContent = isCharacterAsset(definition)
      ? definition.category.toUpperCase()
      : ITEM_CATEGORIES.has(definition.category)
        ? `ITEM · ${definition.category.toUpperCase()}`
        : definition.category.toUpperCase();
    list.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.getAttribute("data-id") === definition.id));
  }

  function renderList(definitions: readonly AssetDefinition[]): void {
    list.replaceChildren();
    if (definitions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "asset-list-empty";
      empty.textContent = "검색 결과가 없다.";
      list.append(empty);
      return;
    }
    definitions.forEach((definition, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = definition.id;
      button.innerHTML = `<span>${String(index + 1).padStart(3, "0")}</span><strong>${definition.label}</strong><em>VIEW</em>`;
      button.addEventListener("click", () => showAsset(definition));
      list.append(button);
    });
    showAsset(definitions[0] as AssetDefinition);
  }

  const categoryMap = {
    avatar: avatarAssets,
    npc: npcAssets,
    fauna: faunaAssets,
    creature: creatureAssets,
    equipment: equipmentAssets,
    world: [...worldPropAssets, ...fieldAssets],
  } as const;
  let activeCategory: keyof typeof categoryMap = "avatar";

  function filterActiveCategory(): void {
    const query = search.value.trim().toLocaleLowerCase("ko-KR");
    const definitions = categoryMap[activeCategory].filter((definition) => {
      const haystack = [definition.label, definition.id, ...(definition.tags ?? [])].join(" ").toLocaleLowerCase("ko-KR");
      return haystack.includes(query);
    });
    renderList(definitions);
  }

  search.addEventListener("input", filterActiveCategory);
  app.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      app.querySelectorAll(".tab").forEach((candidate) => candidate.classList.toggle("is-active", candidate === tab));
      activeCategory = tab.dataset.category as keyof typeof categoryMap;
      search.value = "";
      filterActiveCategory();
    });
  });

  renderList(avatarAssets);
  window.addEventListener("beforeunload", () => viewport.dispose(), { once: true });
  if (assetCatalog.length !== 655) throw new Error("Asset catalog count is out of sync");
}
