import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls, type TransformControlsMode } from "three/examples/jsm/controls/TransformControls.js";
import type { AssetDefinition, AvatarGroup, SculptRuntime } from "../../assets/types";
import { attachClassEquipmentPreview } from "../attachClassEquipmentPreview";
import type {
  CameraSnapshot,
  EditorPartSelection,
  OverlayState,
  SerializableBox3,
  SerializableTransform,
} from "../resource-editor/editorTypes";
import { DEFAULT_OVERLAYS } from "../resource-editor/editorTypes";
import { getStablePartKey } from "../resource-editor/resourceManifest";
import { disposeObject } from "./disposeObject";

const ITEM_CATEGORIES = new Set<AssetDefinition["category"]>(["weapon", "outfit", "head", "accessory", "equipment"]);

export interface ViewportNode {
  readonly object: THREE.Object3D;
  readonly name: string;
  readonly nodePath: readonly string[];
  readonly partKey: string;
  readonly depth: number;
  readonly kind: "mesh" | "group" | "socket";
}

export interface AssetViewportOptions {
  readonly canvas: HTMLCanvasElement;
  readonly container: HTMLElement;
  readonly editable?: boolean;
  readonly autoMotion?: boolean;
  readonly onSelectionChange?: (selection: EditorPartSelection | null, node: THREE.Object3D | null) => void;
  readonly onAssetReady?: () => void;
}

function isCharacterAsset(definition: AssetDefinition): boolean {
  return definition.category === "avatar" || definition.category === "npc";
}

function createWearablePreview(definition: AssetDefinition, asset: THREE.Group): THREE.Group {
  if (definition.category !== "outfit" && definition.category !== "head") return asset;
  const display = new THREE.Group();
  display.name = `${definition.id}.display`;
  display.add(asset);
  const addDummyPart = (name: string, geometry: THREE.BufferGeometry, y: number, x = 0): THREE.Mesh => {
    const part = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x17283a, roughness: 0.82 }));
    part.name = name;
    part.position.set(x, y, 0);
    part.castShadow = true;
    display.add(part);
    return part;
  };
  if (definition.category === "outfit") {
    const head = addDummyPart("display.head", new THREE.SphereGeometry(0.4, 16, 12), 2.52);
    head.scale.set(0.86, 1, 0.82);
    addDummyPart("display.neck", new THREE.CylinderGeometry(0.13, 0.15, 0.28, 10), 2.12);
    addDummyPart("display.arm.L", new THREE.CapsuleGeometry(0.13, 0.7, 6, 10), 1.05, 0.66);
    addDummyPart("display.arm.R", new THREE.CapsuleGeometry(0.13, 0.7, 6, 10), 1.05, -0.66);
  } else {
    const head = addDummyPart("display.head", new THREE.SphereGeometry(0.48, 16, 12), 0);
    head.scale.set(0.88, 1, 0.84);
    addDummyPart("display.neck", new THREE.CylinderGeometry(0.14, 0.17, 0.34, 10), -0.58);
    const torso = addDummyPart("display.bust", new THREE.CapsuleGeometry(0.42, 0.52, 6, 12), -1.22);
    torso.scale.z = 0.7;
  }
  return display;
}

function vector3(value: THREE.Vector3): readonly [number, number, number] {
  return [value.x, value.y, value.z];
}

function serializeTransform(object: THREE.Object3D): SerializableTransform {
  return {
    position: vector3(object.position),
    quaternion: [object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w],
    scale: vector3(object.scale),
  };
}

function serializeBounds(object: THREE.Object3D): SerializableBox3 {
  const bounds = new THREE.Box3().setFromObject(object);
  return { min: vector3(bounds.min), max: vector3(bounds.max) };
}

function findRuntime(root: THREE.Object3D): SculptRuntime | null {
  let runtime: SculptRuntime | null = null;
  root.traverse((node) => {
    if (runtime) return;
    const candidate = node.userData.sculptRuntime as SculptRuntime | undefined;
    if (candidate) runtime = candidate;
  });
  return runtime;
}

export class AssetViewport {
  public currentAsset: THREE.Group | null = null;
  public currentDefinition: AssetDefinition | null = null;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
  private readonly controls: OrbitControls;
  private readonly transformControls: TransformControls;
  private readonly transformHelper: THREE.Object3D;
  private readonly accentRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly overlayRoot = new THREE.Group();
  private readonly selectionOverlay = new THREE.Group();
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private animationFrame = 0;
  private selectedNode: THREE.Object3D | null = null;
  private selectedPartKey: string | null = null;
  private currentChestBaseY = 3.02;
  private overlays: OverlayState = { ...DEFAULT_OVERLAYS };
  private pointerStart: readonly [number, number] | null = null;
  private draftEnabled = false;
  private readonly materialWireframes = new Map<THREE.Material, boolean>();

  public constructor(private readonly options: AssetViewportOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color(0x101728);
    this.scene.fog = new THREE.Fog(0x101728, 10, 21);
    this.camera.position.set(5.9, 4.2, 8.7);
    this.controls = new OrbitControls(this.camera, options.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 2.35, 0);
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 18;
    this.controls.maxPolarAngle = Math.PI * 0.72;

    this.transformControls = new TransformControls(this.camera, options.canvas);
    this.transformControls.enabled = Boolean(options.editable);
    this.transformHelper = this.transformControls.getHelper();
    this.transformHelper.visible = false;
    this.scene.add(this.transformHelper);
    this.transformControls.addEventListener("dragging-changed", (event) => {
      this.controls.enabled = !event.value;
      if (!event.value) this.notifySelection();
    });

    this.scene.add(new THREE.HemisphereLight(0xa9c7e8, 0x1d2533, 1.65));
    const key = new THREE.DirectionalLight(0xffe0c0, 3.2);
    key.position.set(4.5, 8, 5.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -2;
    key.shadow.radius = 4;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7297ff, 2.2);
    rim.position.set(-5, 5, -5);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xeaf4ff, 1.45);
    fill.position.set(-1, 3.5, 8);
    this.scene.add(fill);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: 0x1a2531, roughness: 0.92 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.6, 0.22, 32), new THREE.MeshStandardMaterial({ color: 0x273647, roughness: 0.58, metalness: 0.12 }));
    pedestal.position.y = 0.11;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);
    this.accentRing = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.018, 8, 64), new THREE.MeshBasicMaterial({ color: 0x77b9c8 }));
    this.accentRing.position.y = 0.235;
    this.accentRing.rotation.x = Math.PI / 2;
    this.scene.add(this.accentRing, this.overlayRoot, this.selectionOverlay);

    options.canvas.addEventListener("pointerdown", this.handlePointerDown);
    options.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(options.container);
    this.resize();
    this.animate();
  }

  public showAsset(definition: AssetDefinition, restorePartKey?: string | null): THREE.Group {
    this.clearAsset();
    this.currentDefinition = definition;
    const created = definition.create();
    this.currentAsset = definition.category === "avatar"
      ? attachClassEquipmentPreview(created as AvatarGroup)
      : createWearablePreview(definition, created);
    this.currentChestBaseY = this.currentAsset.getObjectByName("chest")?.position.y ?? 3.02;

    if (definition.category === "avatar") {
      const avatar = this.currentAsset as AvatarGroup;
      void avatar.userData.assetReady?.then(() => {
        if (this.currentAsset !== avatar) return;
        this.currentChestBaseY = avatar.userData.sculptRuntime.nodes.chest?.position.y ?? 0;
        this.options.container.dataset.assetSource = avatar.userData.assetSource ?? "unknown";
        this.finishAssetReady(restorePartKey);
      });
    }

    this.currentAsset.position.y = 0.24;
    if (definition.category === "outfit" || definition.category === "head") {
      this.currentAsset.rotation.set(0, -0.3, 0);
      this.currentAsset.scale.setScalar(1.15);
    } else if (ITEM_CATEGORIES.has(definition.category)) {
      this.currentAsset.rotation.set(0.12, -0.42, -0.18);
      this.currentAsset.scale.setScalar(1.25);
    } else if (definition.category === "field") {
      this.currentAsset.scale.setScalar(definition.id === "field.grass-tuft" ? 2 : 1.15);
    } else if (definition.category === "fauna" || definition.category === "creature" || definition.category === "world") {
      this.currentAsset.scale.setScalar(1.08);
    }
    this.scene.add(this.currentAsset);
    this.finishAssetReady(restorePartKey);
    return this.currentAsset;
  }

  public frameAsset(): void {
    if (!this.currentAsset) return;
    this.currentAsset.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(this.currentAsset);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const verticalDistance = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)));
    const horizontalFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * this.camera.aspect);
    const horizontalDistance = size.x / (2 * Math.tan(horizontalFov * 0.5));
    const distance = Math.max(verticalDistance, horizontalDistance, size.z * 1.7) * 1.5;
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(center);
    this.camera.position.copy(center).addScaledVector(direction, distance);
    this.controls.update();
    this.options.container.dataset.frame = `${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}@${distance.toFixed(2)}`;
  }

  public setViewPreset(preset: "front" | "side" | "back" | "top"): void {
    if (!this.currentAsset) return;
    const bounds = new THREE.Box3().setFromObject(this.currentAsset);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * this.camera.aspect);
    const screenWidth = preset === "side" ? size.z : size.x;
    const screenHeight = preset === "top" ? size.z : size.y;
    const viewDepth = preset === "side" ? size.x : preset === "top" ? size.y : size.z;
    const verticalDistance = screenHeight / (2 * Math.tan(verticalFov * 0.5));
    const horizontalDistance = screenWidth / (2 * Math.tan(horizontalFov * 0.5));
    const distance = Math.max((Math.max(verticalDistance, horizontalDistance) + viewDepth * 0.5) * 1.22, 3.4);
    const direction = preset === "front" ? new THREE.Vector3(0, 0.08, 1)
      : preset === "side" ? new THREE.Vector3(1, 0.08, 0)
        : preset === "back" ? new THREE.Vector3(0, 0.08, -1)
          : new THREE.Vector3(0, 1, 0.001);
    this.controls.target.copy(center);
    this.camera.position.copy(center).addScaledVector(direction.normalize(), distance);
    this.controls.update();
  }

  public getCameraSnapshot(): CameraSnapshot {
    return { position: vector3(this.camera.position), target: vector3(this.controls.target), fov: this.camera.fov };
  }

  public restoreCamera(snapshot: CameraSnapshot): void {
    this.camera.position.set(...snapshot.position);
    this.controls.target.set(...snapshot.target);
    this.camera.fov = snapshot.fov;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  public getNodes(): readonly ViewportNode[] {
    if (!this.currentAsset) return [];
    const nodes: ViewportNode[] = [];
    const walk = (object: THREE.Object3D, path: readonly string[], depth: number): void => {
      const segment = object.name || `${object.type}.${object.parent?.children.indexOf(object) ?? 0}`;
      const nodePath = [...path, segment];
      if (object.name) {
        const isSocket = object.userData.socket === true || object.name === "hand.R" || object.name === "hand.L" || object.name === "head" || object.name === "back";
        nodes.push({
          object,
          name: object.name,
          nodePath,
          partKey: getStablePartKey(nodePath, object.userData.partKey),
          depth,
          kind: isSocket ? "socket" : object instanceof THREE.Mesh ? "mesh" : "group",
        });
      }
      object.children.forEach((child) => walk(child, nodePath, depth + 1));
    };
    walk(this.currentAsset, [], 0);
    return nodes;
  }

  public selectPart(partKey: string | null): EditorPartSelection | null {
    if (!partKey) {
      this.selectedNode = null;
      this.selectedPartKey = null;
      this.transformControls.detach();
      this.transformHelper.visible = false;
      this.rebuildSelectionOverlay();
      this.options.onSelectionChange?.(null, null);
      return null;
    }
    const match = this.getNodes().find((node) => node.partKey === partKey);
    if (!match) return null;
    this.selectedNode = match.object;
    this.selectedPartKey = match.partKey;
    if (this.draftEnabled) {
      this.transformControls.attach(match.object);
      this.transformHelper.visible = true;
    }
    this.rebuildSelectionOverlay();
    const selection = this.serializeSelection(match.object, match.partKey);
    this.options.onSelectionChange?.(selection, match.object);
    return selection;
  }

  public getSelectedPart(): EditorPartSelection | null {
    return this.selectedNode && this.selectedPartKey ? this.serializeSelection(this.selectedNode, this.selectedPartKey) : null;
  }

  public setOverlays(overlays: OverlayState): void {
    this.overlays = { ...overlays };
    this.applyWireframe();
    this.rebuildAssetOverlays();
    this.rebuildSelectionOverlay();
  }

  public getOverlays(): OverlayState {
    return { ...this.overlays };
  }

  public setDraftTransform(enabled: boolean, mode: TransformControlsMode = "translate"): void {
    this.draftEnabled = enabled;
    this.transformControls.setMode(mode);
    if (enabled && this.selectedNode) {
      this.transformControls.attach(this.selectedNode);
      this.transformHelper.visible = true;
    } else {
      this.transformControls.detach();
      this.transformHelper.visible = false;
    }
  }

  public captureDataUrl(): string {
    this.renderer.render(this.scene, this.camera);
    return this.options.canvas.toDataURL("image/png");
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.options.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.options.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.clearAsset();
    disposeObject(this.overlayRoot);
    disposeObject(this.selectionOverlay);
    this.transformControls.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }

  private finishAssetReady(restorePartKey?: string | null): void {
    this.frameAsset();
    this.applyWireframe();
    this.rebuildAssetOverlays();
    if (restorePartKey) this.selectPart(restorePartKey);
    this.options.onAssetReady?.();
  }

  private clearAsset(): void {
    this.selectedNode = null;
    this.selectedPartKey = null;
    this.transformControls.detach();
    this.transformHelper.visible = false;
    this.rebuildSelectionOverlay();
    this.materialWireframes.clear();
    if (this.currentAsset) {
      this.scene.remove(this.currentAsset);
      disposeObject(this.currentAsset);
      this.currentAsset = null;
    }
    this.clearGroup(this.overlayRoot);
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length) {
      const child = group.children.pop();
      if (child) disposeObject(child);
    }
  }

  private applyWireframe(): void {
    if (!this.currentAsset) return;
    this.currentAsset.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        const wireframeMaterial = material as THREE.Material & { wireframe?: boolean };
        if (typeof wireframeMaterial.wireframe !== "boolean") continue;
        if (!this.materialWireframes.has(material)) this.materialWireframes.set(material, wireframeMaterial.wireframe);
        wireframeMaterial.wireframe = this.overlays.wireframe ? true : (this.materialWireframes.get(material) ?? false);
        material.needsUpdate = true;
      }
    });
  }

  private rebuildAssetOverlays(): void {
    this.clearGroup(this.overlayRoot);
    if (!this.currentAsset) return;
    const runtime = findRuntime(this.currentAsset);
    if (this.overlays.bounds) this.overlayRoot.add(new THREE.BoxHelper(this.currentAsset, 0x5e7f91));
    if (this.overlays.sockets && runtime) {
      const geometry = new THREE.SphereGeometry(0.045, 10, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0x63d8c7, depthTest: false });
      Object.values(runtime.sockets).forEach((socket) => {
        const marker = new THREE.Mesh(geometry.clone(), material.clone());
        marker.name = `overlay.socket.${socket.name}`;
        socket.getWorldPosition(marker.position);
        this.overlayRoot.add(marker);
      });
    }
    if (this.overlays.colliders && runtime) {
      runtime.colliders.forEach((collider) => this.overlayRoot.add(new THREE.BoxHelper(collider, 0xf2a65a)));
    }
  }

  private rebuildSelectionOverlay(): void {
    this.clearGroup(this.selectionOverlay);
    if (!this.selectedNode) return;
    this.selectionOverlay.add(new THREE.BoxHelper(this.selectedNode, 0x76f4dc));
    if (this.overlays.axes) {
      const axes = new THREE.AxesHelper(0.7);
      this.selectedNode.getWorldPosition(axes.position);
      this.selectionOverlay.add(axes);
    }
  }

  private serializeSelection(node: THREE.Object3D, partKey: string): EditorPartSelection {
    const viewportNode = this.getNodes().find((candidate) => candidate.object === node);
    return {
      nodePath: viewportNode?.nodePath ?? [node.name],
      nodeName: node.name,
      partKey,
      localTransform: serializeTransform(node),
      worldBounds: serializeBounds(node),
    };
  }

  private notifySelection(): void {
    const selection = this.getSelectedPart();
    this.rebuildSelectionOverlay();
    this.options.onSelectionChange?.(selection, this.selectedNode);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerStart = [event.clientX, event.clientY];
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.options.editable || !this.currentAsset || !this.pointerStart) return;
    const distance = Math.hypot(event.clientX - this.pointerStart[0], event.clientY - this.pointerStart[1]);
    this.pointerStart = null;
    if (distance > 5) return;
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.currentAsset, true).find((intersection) => intersection.object.name);
    if (!hit) return;
    const node = this.getNodes().find((candidate) => candidate.object === hit.object);
    if (node) this.selectPart(node.partKey);
  };

  private resize(): void {
    const { width, height } = this.options.container.getBoundingClientRect();
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  private animate(): void {
    const elapsed = this.clock.getElapsedTime();
    if (this.currentAsset && this.options.autoMotion !== false && !this.draftEnabled) {
      this.currentAsset.rotation.y = Math.sin(elapsed * 0.34) * 0.16;
      if (this.currentDefinition && isCharacterAsset(this.currentDefinition)) {
        const chest = this.currentAsset.getObjectByName("chest");
        if (chest) chest.position.y = this.currentChestBaseY + Math.sin(elapsed * 1.65) * 0.014;
        const hair = this.currentAsset.getObjectByName("hair");
        if (hair) hair.rotation.z = Math.sin(elapsed * 1.15) * 0.015;
      }
    }
    this.accentRing.material.color.setHSL(0.52 + Math.sin(elapsed * 0.4) * 0.025, 0.48, 0.62);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }
}
