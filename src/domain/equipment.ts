import { getItemDefinition } from "./catalog";
import type { CharacterProfile } from "./character";

export type EquipItemResult =
  | { readonly ok: true; readonly profile: CharacterProfile }
  | {
      readonly ok: false;
      readonly profile: CharacterProfile;
      readonly reason: "unknown-item" | "item-not-owned";
    };

export function equipOwnedItem(profile: CharacterProfile, itemId: string): EquipItemResult {
  const item = getItemDefinition(itemId);
  if (!item) return { ok: false, profile, reason: "unknown-item" };
  if (!profile.ownedItemIds.includes(itemId)) {
    return { ok: false, profile, reason: "item-not-owned" };
  }

  return {
    ok: true,
    profile: {
      ...profile,
      equipped: {
        ...profile.equipped,
        [item.slot]: item.id,
      },
    },
  };
}
