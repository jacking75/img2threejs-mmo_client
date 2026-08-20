import { assetCatalog, avatarAssets, creatureAssets, equipmentAssets, faunaAssets, fieldAssets, npcAssets, worldPropAssets } from "../../assets/catalog";
import type { AssetDefinition } from "../../assets/types";

type CatalogCategory = "all" | "avatar" | "npc" | "fauna" | "creature" | "equipment" | "world" | "favorites" | "recent";

const CATEGORY_GROUPS: Readonly<Record<Exclude<CatalogCategory, "favorites" | "recent">, readonly AssetDefinition[]>> = {
  all: assetCatalog,
  avatar: avatarAssets,
  npc: npcAssets,
  fauna: faunaAssets,
  creature: creatureAssets,
  equipment: equipmentAssets,
  world: [...worldPropAssets, ...fieldAssets],
};

export interface CatalogPanelOptions {
  readonly root: HTMLElement;
  readonly selectedId?: string;
  readonly favoriteIds: readonly string[];
  readonly recentIds: readonly string[];
  readonly onSelect: (definition: AssetDefinition) => void;
  readonly onToggleFavorite: (assetId: string) => void;
}

export class CatalogPanel {
  private activeCategory: CatalogCategory = "all";
  private favoriteIds: readonly string[];
  private recentIds: readonly string[];
  private selectedId?: string;
  private readonly search: HTMLInputElement;
  private readonly list: HTMLElement;

  public constructor(private readonly options: CatalogPanelOptions) {
    this.favoriteIds = options.favoriteIds;
    this.recentIds = options.recentIds;
    this.selectedId = options.selectedId;
    options.root.innerHTML = `
      <div class="re-panel-head">
        <div><span class="re-kicker">CATALOG</span><strong>리소스 · ${assetCatalog.length}</strong></div>
        <span class="re-count" id="re-filter-count">${assetCatalog.length}</span>
      </div>
      <div class="re-catalog-tabs" role="tablist" aria-label="리소스 분류">
        <button class="is-active" type="button" data-category="all">전체</button>
        <button type="button" data-category="avatar">캐릭터</button>
        <button type="button" data-category="npc">NPC</button>
        <button type="button" data-category="fauna">동물</button>
        <button type="button" data-category="creature">몬스터</button>
        <button type="button" data-category="equipment">아이템</button>
        <button type="button" data-category="world">월드</button>
        <button type="button" data-category="favorites">★ 즐겨찾기</button>
        <button type="button" data-category="recent">최근</button>
      </div>
      <label class="re-search"><span>검색</span><input type="search" placeholder="이름, ID, 태그" autocomplete="off"></label>
      <div class="re-asset-list" role="listbox" aria-label="리소스 목록"></div>
    `;
    const search = options.root.querySelector<HTMLInputElement>("input[type=search]");
    const list = options.root.querySelector<HTMLElement>(".re-asset-list");
    if (!search || !list) throw new Error("카탈로그 패널 초기화에 실패했다.");
    this.search = search;
    this.list = list;
    this.search.addEventListener("input", () => this.render());
    options.root.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        this.activeCategory = button.dataset.category as CatalogCategory;
        options.root.querySelectorAll("[data-category]").forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
        this.render();
      });
    });
    this.render();
  }

  public setSelected(assetId: string): void {
    this.selectedId = assetId;
    this.renderActiveState();
  }

  public setHistory(favoriteIds: readonly string[], recentIds: readonly string[]): void {
    this.favoriteIds = favoriteIds;
    this.recentIds = recentIds;
    this.render();
  }

  private definitions(): readonly AssetDefinition[] {
    if (this.activeCategory === "favorites") return this.favoriteIds.map((id) => assetCatalog.find((definition) => definition.id === id)).filter((definition): definition is AssetDefinition => Boolean(definition));
    if (this.activeCategory === "recent") return this.recentIds.map((id) => assetCatalog.find((definition) => definition.id === id)).filter((definition): definition is AssetDefinition => Boolean(definition));
    return CATEGORY_GROUPS[this.activeCategory];
  }

  private render(): void {
    const query = this.search.value.trim().toLocaleLowerCase("ko-KR");
    const definitions = this.definitions().filter((definition) => {
      const haystack = [definition.label, definition.id, definition.category, ...(definition.tags ?? [])].join(" ").toLocaleLowerCase("ko-KR");
      return haystack.includes(query);
    });
    const count = this.options.root.querySelector<HTMLElement>("#re-filter-count");
    if (count) count.textContent = String(definitions.length);
    this.list.replaceChildren();
    if (!definitions.length) {
      const empty = document.createElement("p");
      empty.className = "re-empty";
      empty.textContent = "조건에 맞는 리소스가 없다.";
      this.list.append(empty);
      return;
    }
    definitions.forEach((definition, index) => {
      const row = document.createElement("div");
      row.className = "re-asset-row";
      const select = document.createElement("button");
      select.type = "button";
      select.dataset.assetId = definition.id;
      select.setAttribute("role", "option");
      select.innerHTML = `<span>${String(index + 1).padStart(3, "0")}</span><span><strong>${definition.label}</strong><small>${definition.id}</small></span><em>${definition.category}</em>`;
      select.addEventListener("click", () => this.options.onSelect(definition));
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "re-favorite";
      favorite.dataset.favoriteId = definition.id;
      favorite.setAttribute("aria-label", `${definition.label} 즐겨찾기`);
      favorite.setAttribute("aria-pressed", String(this.favoriteIds.includes(definition.id)));
      favorite.textContent = this.favoriteIds.includes(definition.id) ? "★" : "☆";
      favorite.addEventListener("click", () => this.options.onToggleFavorite(definition.id));
      row.append(select, favorite);
      this.list.append(row);
    });
    this.renderActiveState();
  }

  private renderActiveState(): void {
    this.list.querySelectorAll<HTMLButtonElement>("[data-asset-id]").forEach((button) => {
      const active = button.dataset.assetId === this.selectedId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }
}
