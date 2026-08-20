import "./resource-editor.css";
import { ResourceEditorApp } from "./ResourceEditorApp";

export function startResourceEditor(): void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("#app root is missing");
  document.body.classList.add("resource-editor-mode");
  const app = new ResourceEditorApp(root);
  app.start();
  window.addEventListener("beforeunload", () => app.dispose(), { once: true });
}
