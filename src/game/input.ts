export interface MovementInputSnapshot {
  readonly forward: number;
  readonly right: number;
  readonly sprint: boolean;
}

const MOVEMENT_CODES = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"]);

export class MovementInput {
  private readonly pressed = new Set<string>();
  private readonly releaseFrameIds = new Map<string, number>();
  private connected = false;
  private enabled = true;

  public connect(): void {
    if (this.connected) return;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    this.connected = true;
  }

  public disconnect(): void {
    if (!this.connected) return;
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    this.releaseFrameIds.forEach((frameId) => cancelAnimationFrame(frameId));
    this.releaseFrameIds.clear();
    this.pressed.clear();
    this.connected = false;
  }

  public read(): MovementInputSnapshot {
    return {
      forward: Number(this.pressed.has("KeyW")) - Number(this.pressed.has("KeyS")),
      right: Number(this.pressed.has("KeyD")) - Number(this.pressed.has("KeyA")),
      sprint: this.pressed.has("ShiftLeft") || this.pressed.has("ShiftRight"),
    };
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.reset();
  }

  public reset(): void {
    this.releaseFrameIds.forEach((frameId) => cancelAnimationFrame(frameId));
    this.releaseFrameIds.clear();
    this.pressed.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!MOVEMENT_CODES.has(event.code)) return;
    event.preventDefault();
    if (!this.enabled) return;
    const releaseFrameId = this.releaseFrameIds.get(event.code);
    if (releaseFrameId !== undefined) cancelAnimationFrame(releaseFrameId);
    this.releaseFrameIds.delete(event.code);
    this.pressed.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!MOVEMENT_CODES.has(event.code)) return;
    event.preventDefault();
    const previousFrameId = this.releaseFrameIds.get(event.code);
    if (previousFrameId !== undefined) cancelAnimationFrame(previousFrameId);
    const frameId = requestAnimationFrame(() => {
      this.pressed.delete(event.code);
      this.releaseFrameIds.delete(event.code);
    });
    this.releaseFrameIds.set(event.code, frameId);
  };

  private readonly handleBlur = (): void => {
    this.reset();
  };
}
