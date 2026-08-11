import * as THREE from "three";

const MIN_PITCH = 0.16;
const MAX_PITCH = 0.92;
const MIN_DISTANCE = 6;
const MAX_DISTANCE = 16;

export class ThirdPersonCamera {
  private readonly desiredPosition = new THREE.Vector3();
  private readonly lookAtPosition = new THREE.Vector3();
  private yaw = Math.PI * 0.82;
  private pitch = 0.42;
  private distance = 10.5;
  private initialized = false;
  private inputElement: HTMLElement | null = null;
  private pointerId: number | null = null;
  private previousPointerX = 0;
  private previousPointerY = 0;

  public constructor(
    public readonly camera: THREE.PerspectiveCamera,
    private readonly target: THREE.Object3D,
    private readonly targetHeight = 1.35,
  ) {}

  public connect(element: HTMLElement): void {
    this.disconnect();
    this.inputElement = element;
    element.addEventListener("pointerdown", this.handlePointerDown);
    element.addEventListener("pointermove", this.handlePointerMove);
    element.addEventListener("pointerup", this.handlePointerUp);
    element.addEventListener("pointercancel", this.handlePointerUp);
    element.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  public disconnect(): void {
    const element = this.inputElement;
    if (!element) return;
    element.removeEventListener("pointerdown", this.handlePointerDown);
    element.removeEventListener("pointermove", this.handlePointerMove);
    element.removeEventListener("pointerup", this.handlePointerUp);
    element.removeEventListener("pointercancel", this.handlePointerUp);
    element.removeEventListener("wheel", this.handleWheel);
    element.classList.remove("is-dragging");
    this.pointerId = null;
    this.inputElement = null;
  }

  public rotate(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaY * 0.004, MIN_PITCH, MAX_PITCH);
  }

  public zoom(delta: number): void {
    this.distance = THREE.MathUtils.clamp(this.distance + delta, MIN_DISTANCE, MAX_DISTANCE);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  public update(deltaSeconds: number): void {
    this.target.getWorldPosition(this.lookAtPosition);
    this.lookAtPosition.y += this.targetHeight;

    const horizontalDistance = Math.cos(this.pitch) * this.distance;
    this.desiredPosition.set(
      this.lookAtPosition.x + Math.sin(this.yaw) * horizontalDistance,
      this.lookAtPosition.y + Math.sin(this.pitch) * this.distance,
      this.lookAtPosition.z + Math.cos(this.yaw) * horizontalDistance,
    );

    if (!this.initialized) {
      this.camera.position.copy(this.desiredPosition);
      this.initialized = true;
    } else {
      const followStrength = 1 - Math.exp(-10 * Math.max(deltaSeconds, 0));
      this.camera.position.lerp(this.desiredPosition, followStrength);
    }
    this.camera.lookAt(this.lookAtPosition);
  }

  public dispose(): void {
    this.disconnect();
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.inputElement) return;
    this.pointerId = event.pointerId;
    this.previousPointerX = event.clientX;
    this.previousPointerY = event.clientY;
    this.inputElement.setPointerCapture(event.pointerId);
    this.inputElement.classList.add("is-dragging");
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.rotate(event.clientX - this.previousPointerX, event.clientY - this.previousPointerY);
    this.previousPointerX = event.clientX;
    this.previousPointerY = event.clientY;
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || !this.inputElement) return;
    if (this.inputElement.hasPointerCapture(event.pointerId)) {
      this.inputElement.releasePointerCapture(event.pointerId);
    }
    this.pointerId = null;
    this.inputElement.classList.remove("is-dragging");
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoom(event.deltaY * 0.008);
  };
}
