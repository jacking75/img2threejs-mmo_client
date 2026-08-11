import { startAssetGallery } from "./dev/AssetGallery";
import "./styles/global.css";
import { startCreationApp } from "./ui/startCreationApp";

const appMode = new URLSearchParams(window.location.search).get("mode") === "gallery"
  ? "asset-gallery"
  : "creation";
const startApp = {
  "asset-gallery": startAssetGallery,
  creation: startCreationApp,
}[appMode];

startApp();
