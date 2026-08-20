import type { CameraSnapshot, EditStatus, EditorSelection, OverlayState } from "./editorTypes";

export interface PersistedEditorState {
  readonly assetId: string;
  readonly partKey: string | null;
  readonly camera: CameraSnapshot;
  readonly overlays: OverlayState;
  readonly sessionId?: string;
  readonly favoriteIds: readonly string[];
  readonly recentAssetIds: readonly string[];
}

const ALLOWED_TRANSITIONS: Readonly<Record<EditStatus, readonly EditStatus[]>> = {
  "context-ready": ["planning"],
  planning: ["awaiting-approval", "completed", "failed", "cancelled"],
  "awaiting-approval": ["applying", "cancelled", "failed"],
  applying: ["reloading", "verifying", "failed", "cancelled"],
  reloading: ["verifying", "failed", "cancelled"],
  verifying: ["completed", "failed", "cancelled"],
  completed: ["planning"],
  failed: ["planning"],
  cancelled: ["planning"],
};

export function transitionEditStatus(current: EditStatus, next: EditStatus): EditStatus {
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`허용되지 않은 편집 상태 전이: ${current} → ${next}`);
  }
  return next;
}

export function withSelectedAsset(
  current: PersistedEditorState,
  selection: EditorSelection,
): PersistedEditorState {
  return {
    ...current,
    assetId: selection.assetId,
    partKey: selection.part?.partKey ?? null,
    camera: selection.camera,
    overlays: selection.overlays,
    recentAssetIds: [selection.assetId, ...current.recentAssetIds.filter((id) => id !== selection.assetId)].slice(0, 12),
  };
}

export function toggleFavorite(current: PersistedEditorState, assetId: string): PersistedEditorState {
  const favoriteIds = current.favoriteIds.includes(assetId)
    ? current.favoriteIds.filter((id) => id !== assetId)
    : [assetId, ...current.favoriteIds];
  return { ...current, favoriteIds };
}

export function parsePersistedEditorState(value: string | null): Partial<PersistedEditorState> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return {};
    const candidate = parsed as Record<string, unknown>;
    const camera = candidate.camera && typeof candidate.camera === "object" ? candidate.camera as Record<string, unknown> : null;
    const vector = (entry: unknown): entry is [number, number, number] => Array.isArray(entry) && entry.length === 3 && entry.every((number) => typeof number === "number" && Number.isFinite(number));
    const overlays = candidate.overlays && typeof candidate.overlays === "object" ? candidate.overlays as Record<string, unknown> : null;
    const parsedOverlays = overlays && ["wireframe", "bounds", "sockets", "colliders", "axes"].every((key) => typeof overlays[key] === "boolean")
      ? overlays as unknown as OverlayState
      : undefined;
    return {
      assetId: typeof candidate.assetId === "string" ? candidate.assetId : undefined,
      partKey: typeof candidate.partKey === "string" || candidate.partKey === null ? candidate.partKey : undefined,
      sessionId: typeof candidate.sessionId === "string" ? candidate.sessionId : undefined,
      camera: camera && vector(camera.position) && vector(camera.target) && typeof camera.fov === "number"
        ? { position: camera.position, target: camera.target, fov: camera.fov }
        : undefined,
      overlays: parsedOverlays,
      favoriteIds: Array.isArray(candidate.favoriteIds) ? candidate.favoriteIds.filter((id): id is string => typeof id === "string") : undefined,
      recentAssetIds: Array.isArray(candidate.recentAssetIds) ? candidate.recentAssetIds.filter((id): id is string => typeof id === "string") : undefined,
    };
  } catch {
    return {};
  }
}
