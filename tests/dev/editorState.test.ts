import { describe, expect, it } from "vitest";
import { parsePersistedEditorState, toggleFavorite, transitionEditStatus, withSelectedAsset, type PersistedEditorState } from "../../src/dev/resource-editor/editorState";
import { DEFAULT_OVERLAYS, type EditorSelection } from "../../src/dev/resource-editor/editorTypes";

const camera = { position: [1, 2, 3] as const, target: [0, 1, 0] as const, fov: 33 };
const state: PersistedEditorState = { assetId: "fauna.wolf.arcane", partKey: null, camera, overlays: DEFAULT_OVERLAYS, favoriteIds: [], recentAssetIds: [] };
const selection: EditorSelection = {
  assetId: "creature.golem.frost",
  category: "creature",
  sourceFiles: ["src/assets/creatures/createCreatureResource.ts"],
  focusedTests: ["tests/assets/creatureResources.test.ts"],
  part: null,
  camera,
  overlays: DEFAULT_OVERLAYS,
};

describe("resource editor state", () => {
  it("허용된 plan/apply 상태 전이만 받는다", () => {
    expect(transitionEditStatus("context-ready", "planning")).toBe("planning");
    expect(transitionEditStatus("planning", "awaiting-approval")).toBe("awaiting-approval");
    expect(() => transitionEditStatus("context-ready", "applying")).toThrow(/허용되지 않은/);
  });

  it("최근 선택과 즐겨찾기를 중복 없이 갱신한다", () => {
    const selected = withSelectedAsset(state, selection);
    expect(selected.assetId).toBe(selection.assetId);
    expect(selected.recentAssetIds).toEqual([selection.assetId]);
    expect(toggleFavorite(toggleFavorite(state, state.assetId), state.assetId).favoriteIds).toEqual([]);
  });

  it("직렬화 가능한 카메라와 overlay만 복원한다", () => {
    const restored = parsePersistedEditorState(JSON.stringify({ ...state, favoriteIds: [state.assetId] }));
    expect(restored.camera).toEqual(camera);
    expect(restored.overlays).toEqual(DEFAULT_OVERLAYS);
    expect(parsePersistedEditorState("not-json")).toEqual({});
  });
});
