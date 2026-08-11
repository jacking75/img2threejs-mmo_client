import { ClientApp } from "../ClientApp";

export function startCreationApp(): void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("#app root is missing");

  const app = new ClientApp(root);
  app.start();
  window.addEventListener("beforeunload", () => app.dispose(), { once: true });
}
