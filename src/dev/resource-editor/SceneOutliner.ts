import type { ViewportNode } from "../shared/AssetViewport";

export class SceneOutliner {
  private nodes: readonly ViewportNode[] = [];

  public constructor(private readonly root: HTMLElement, private readonly onSelect: (partKey: string) => void) {}

  public render(nodes: readonly ViewportNode[], selectedPartKey: string | null): void {
    this.nodes = nodes;
    this.root.replaceChildren();
    const fragment = document.createDocumentFragment();
    nodes.forEach((node) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "re-node";
      button.dataset.partKey = node.partKey;
      button.classList.toggle("is-active", node.partKey === selectedPartKey);
      button.style.setProperty("--node-depth", String(Math.min(node.depth, 6)));
      button.innerHTML = `<span class="re-node-kind">${node.kind === "mesh" ? "◆" : node.kind === "socket" ? "⊕" : "◇"}</span><span>${node.name}</span>`;
      button.title = node.partKey;
      button.addEventListener("click", () => this.onSelect(node.partKey));
      fragment.append(button);
    });
    this.root.append(fragment);
  }

  public setSelected(partKey: string | null): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-part-key]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.partKey === partKey);
    });
  }

  public filter(query: string): void {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    this.root.querySelectorAll<HTMLButtonElement>("[data-part-key]").forEach((button) => {
      const node = this.nodes.find((candidate) => candidate.partKey === button.dataset.partKey);
      button.hidden = Boolean(normalized) && !`${node?.name ?? ""} ${node?.partKey ?? ""}`.toLocaleLowerCase("ko-KR").includes(normalized);
    });
  }
}
