import type { CharacterProfile } from "./domain/character";
import { clearProfile, loadProfile, saveProfile } from "./domain/save";
import { GameApp } from "./game/GameApp";
import { CharacterSelectionScreen } from "./ui/CharacterSelectionScreen";
import { CreationScreen } from "./ui/CreationScreen";

export type AppMode = "selection" | "creation" | "field";

interface DisposableScreen {
  start(): void;
  dispose(): void;
}

export class ClientApp {
  private mode: AppMode = "selection";
  private game: GameApp | null = null;
  private screen: DisposableScreen | null = null;

  public constructor(private readonly root: HTMLElement) {}

  public start(): void {
    this.showSelection(loadProfile());
  }

  public dispose(): void {
    this.game?.dispose();
    this.game = null;
    this.screen?.dispose();
    this.screen = null;
  }

  private showCreation(): void {
    this.setMode("creation");
    this.screen = new CreationScreen({
      root: this.root,
      onComplete: (profile) => {
        if (!saveProfile(profile)) return false;
        this.showSelection(profile);
        return true;
      },
      onCancel: () => this.showSelection(loadProfile()),
    });
    this.screen.start();
  }

  private showSelection(profile: CharacterProfile | null): void {
    this.setMode("selection");
    this.screen = new CharacterSelectionScreen({
      root: this.root,
      profile,
      onCreate: () => this.showCreation(),
      onDelete: () => {
        if (!clearProfile()) return false;
        this.showSelection(null);
        return true;
      },
      onEnterField: (selectedProfile) => this.showField(selectedProfile),
    });
    this.screen.start();
  }

  private showField(profile: CharacterProfile): void {
    this.setMode("field");
    this.game = new GameApp({
      root: this.root,
      profile,
      onProfileChange: (updatedProfile) => saveProfile(updatedProfile),
      onExit: () => this.showSelection(loadProfile()),
    });
    this.game.start();
  }

  private setMode(mode: AppMode): void {
    this.game?.dispose();
    this.game = null;
    this.screen?.dispose();
    this.screen = null;
    this.mode = mode;
    this.root.dataset.appMode = this.mode;
    document.body.classList.toggle("field-mode", this.mode === "field");
  }
}
