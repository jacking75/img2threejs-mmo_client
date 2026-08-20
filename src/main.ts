import "./styles/global.css";

const mode = new URLSearchParams(window.location.search).get("mode");
const appMode = mode === "editor" ? "resource-editor" : mode === "gallery" ? "asset-gallery" : "creation";

if (appMode === "resource-editor") {
  const { startResourceEditor } = await import("./dev/resource-editor/startResourceEditor");
  startResourceEditor();
} else if (appMode === "asset-gallery") {
  const { startAssetGallery } = await import("./dev/AssetGallery");
  startAssetGallery();
} else {
  const { startCreationApp } = await import("./ui/startCreationApp");
  startCreationApp();
}
