import "./styles/global.css";

const appMode = new URLSearchParams(window.location.search).get("mode") === "gallery"
  ? "asset-gallery"
  : "creation";

if (appMode === "asset-gallery") {
  const { startAssetGallery } = await import("./dev/AssetGallery");
  startAssetGallery();
} else {
  const { startCreationApp } = await import("./ui/startCreationApp");
  startCreationApp();
}
