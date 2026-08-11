import { EQUIPMENT_SLOTS } from "../domain/character";
import type { CharacterProfile, EquipmentSlot } from "../domain/character";
import { ITEM_CATALOG } from "../domain/catalog";

const SLOT_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  weapon: "무기",
  outfit: "의상",
  head: "머리",
};

export interface InventoryItemView {
  readonly id: string;
  readonly label: string;
  readonly owned: boolean;
  readonly equipped: boolean;
}

export interface InventorySlotView {
  readonly slot: EquipmentSlot;
  readonly label: string;
  readonly items: readonly InventoryItemView[];
}

export function buildInventorySlotViews(profile: CharacterProfile): readonly InventorySlotView[] {
  const items = Object.values(ITEM_CATALOG);
  return EQUIPMENT_SLOTS.map((slot) => ({
    slot,
    label: SLOT_LABELS[slot],
    items: items
      .filter((item) => item.slot === slot)
      .map((item) => ({
        id: item.id,
        label: item.label,
        owned: profile.ownedItemIds.includes(item.id),
        equipped: profile.equipped[slot] === item.id,
      })),
  }));
}

export interface InventoryPanelOptions {
  readonly root: HTMLElement;
  readonly toggleButton: HTMLButtonElement;
  readonly profile: CharacterProfile;
  readonly onEquip: (itemId: string) => boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export class InventoryPanel {
  private readonly root: HTMLElement;
  private readonly toggleButton: HTMLButtonElement;
  private readonly onEquip: (itemId: string) => boolean;
  private readonly onOpenChange: (open: boolean) => void;
  private profile: CharacterProfile;
  private open = false;

  public constructor(options: InventoryPanelOptions) {
    this.root = options.root;
    this.toggleButton = options.toggleButton;
    this.profile = options.profile;
    this.onEquip = options.onEquip;
    this.onOpenChange = options.onOpenChange;
  }

  public start(): void {
    this.root.addEventListener("click", this.handleClick);
    this.toggleButton.addEventListener("click", this.handleToggleClick);
    window.addEventListener("keydown", this.handleKeyDown);
    this.render();
    this.applyOpenState();
  }

  public updateProfile(profile: CharacterProfile): void {
    this.profile = profile;
    this.render();
  }

  public isOpen(): boolean {
    return this.open;
  }

  public setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.applyOpenState();
    this.onOpenChange(open);
  }

  public dispose(): void {
    this.root.removeEventListener("click", this.handleClick);
    this.toggleButton.removeEventListener("click", this.handleToggleClick);
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private render(): void {
    const groups = buildInventorySlotViews(this.profile);
    this.root.innerHTML = `
      <div class="inventory-backdrop" data-inventory-close></div>
      <section class="inventory-panel" role="dialog" aria-modal="true" aria-labelledby="inventory-title">
        <header class="inventory-header">
          <div>
            <p>ADVENTURER LOADOUT</p>
            <h2 id="inventory-title">인벤토리</h2>
          </div>
          <button class="inventory-close" type="button" data-inventory-close aria-label="인벤토리 닫기">×</button>
        </header>
        <div class="inventory-groups">
          ${groups.map((group) => `
            <section class="inventory-group" aria-labelledby="inventory-${group.slot}">
              <h3 id="inventory-${group.slot}">${group.label}</h3>
              <div class="inventory-items">
                ${group.items.map((item) => `
                  <button
                    class="inventory-item${item.equipped ? " is-equipped" : ""}"
                    type="button"
                    data-item-id="${item.id}"
                    aria-pressed="${item.equipped}"
                    ${!item.owned || item.equipped ? "disabled" : ""}
                  >
                    <span class="inventory-item-mark" aria-hidden="true">${getItemMark(item.id)}</span>
                    <strong>${item.label}</strong>
                    <small>${item.equipped ? "장착 중" : item.owned ? "장착하기" : "사용 불가"}</small>
                  </button>
                `).join("")}
              </div>
            </section>
          `).join("")}
        </div>
        <footer>아이템 선택 즉시 저장된다 · I / Esc 닫기</footer>
      </section>
    `;
  }

  private applyOpenState(): void {
    this.root.hidden = !this.open;
    this.root.setAttribute("aria-hidden", String(!this.open));
    this.toggleButton.setAttribute("aria-expanded", String(this.open));
  }

  private readonly handleToggleClick = (): void => {
    this.setOpen(!this.open);
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-inventory-close]")) {
      this.setOpen(false);
      return;
    }
    const button = target.closest<HTMLButtonElement>("button[data-item-id]");
    if (!button || button.disabled) return;
    const itemId = button.dataset.itemId;
    if (itemId && this.onEquip(itemId)) this.render();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === "KeyI" && !event.repeat) {
      event.preventDefault();
      this.setOpen(!this.open);
    } else if (event.code === "Escape" && this.open) {
      event.preventDefault();
      this.setOpen(false);
    }
  };
}

function getItemMark(itemId: string): string {
  if (itemId.startsWith("weapon.")) return "⚔";
  if (itemId.startsWith("outfit.")) return "◆";
  return itemId === "head.none" ? "—" : "▲";
}
