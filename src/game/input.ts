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

const CLICK_DRAG_THRESHOLD_SQ = 36;

export class AttackInput {
  private inputElement: HTMLElement | null = null;
  private enabled = true;
  private requested = false;
  private pointerId: number | null = null;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerTravelSq = 0;

  public connect(element: HTMLElement): void {
    this.disconnect();
    this.inputElement = element;
    window.addEventListener("keydown", this.handleKeyDown);
    element.addEventListener("pointerdown", this.handlePointerDown);
    element.addEventListener("pointermove", this.handlePointerMove);
    element.addEventListener("pointerup", this.handlePointerUp);
    element.addEventListener("pointercancel", this.handlePointerCancel);
  }

  public disconnect(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    if (this.inputElement) {
      this.inputElement.removeEventListener("pointerdown", this.handlePointerDown);
      this.inputElement.removeEventListener("pointermove", this.handlePointerMove);
      this.inputElement.removeEventListener("pointerup", this.handlePointerUp);
      this.inputElement.removeEventListener("pointercancel", this.handlePointerCancel);
    }
    this.inputElement = null;
    this.reset();
  }

  public consumeRequest(): boolean {
    const requested = this.requested;
    this.requested = false;
    return requested;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  private reset(): void {
    this.requested = false;
    this.pointerId = null;
    this.pointerTravelSq = 0;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "KeyF") return;
    event.preventDefault();
    if (this.enabled && !event.repeat) this.requested = true;
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled || event.button !== 0) return;
    this.pointerId = event.pointerId;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.pointerTravelSq = 0;
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    const x = event.clientX - this.pointerStartX;
    const y = event.clientY - this.pointerStartY;
    this.pointerTravelSq = Math.max(this.pointerTravelSq, x * x + y * y);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    if (this.enabled && this.pointerTravelSq <= CLICK_DRAG_THRESHOLD_SQ) this.requested = true;
    this.pointerId = null;
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.pointerId = null;
  };
}
