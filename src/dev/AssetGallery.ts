import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { assetCatalog, avatarAssets, equipmentAssets, fieldAssets } from "../assets/catalog";
import type { AssetDefinition, AvatarGroup } from "../assets/types";
import { attachClassEquipmentPreview } from "./attachClassEquipmentPreview";

export function startAssetGallery(): void {
  const appNode = document.querySelector<HTMLElement>("#app");
  if (!appNode) throw new Error("#app root is missing");
  const app: HTMLElement = appNode;

  app.innerHTML = `
    <section class="atelier" aria-label="캐릭터 리소스 갤러리">
      <header class="brand">
        <p class="eyebrow">IMG2THREEJS · ASSET ATELIER</p>
        <h1>별빛 개척단</h1>
        <p>콘셉트 시트에서 재구성한 5등신 모듈형 캐릭터와 필드 리소스다.</p>
      </header>
      <div class="viewport-wrap">
        <canvas class="viewport" aria-label="선택한 3D 리소스 미리보기"></canvas>
        <div class="view-hint">드래그 회전 · 휠 확대</div>
        <div class="asset-badge"><span id="asset-kind">CHARACTER</span><strong id="asset-name">여성형 전사</strong></div>
      </div>
      <aside class="catalog-panel">
        <div class="tabs" role="tablist" aria-label="리소스 종류">
          <button class="tab is-active" data-category="avatar" type="button">캐릭터 <small>06</small></button>
          <button class="tab" data-category="equipment" type="button">장비 <small>05</small></button>
          <button class="tab" data-category="field" type="button">필드 <small>04</small></button>
        </div>
        <div id="asset-list" class="asset-list"></div>
        <footer>
          <span><i class="dot dot-blue"></i> 5 HEAD UNIT</span>
          <span><i class="dot dot-gold"></i> ACTION READY</span>
        </footer>
      </aside>
    </section>
  `;

  function requiredElement<T extends Element>(selector: string): T {
    const element = app.querySelector<T>(selector);
    if (!element) throw new Error(`Gallery element is missing: ${selector}`);
    return element;
  }

  const canvas = requiredElement<HTMLCanvasElement>("canvas");
  const viewportWrap = requiredElement<HTMLElement>(".viewport-wrap");
  const list = requiredElement<HTMLElement>("#asset-list");
  const assetName = requiredElement<HTMLElement>("#asset-name");
  const assetKind = requiredElement<HTMLElement>("#asset-kind");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101728);
  scene.fog = new THREE.Fog(0x101728, 10, 21);

  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
  camera.position.set(5.9, 4.2, 8.7);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 2.35, 0);
  controls.minDistance = 3.8;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.54;

  scene.add(new THREE.HemisphereLight(0xa9c7e8, 0x1d2533, 1.65));
  const key = new THREE.DirectionalLight(0xffe0c0, 3.2);
  key.position.set(4.5, 8, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -2;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7297ff, 2.2);
  rim.position.set(-5, 5, -5);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a2531, roughness: 0.92 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.6, 0.22, 32),
    new THREE.MeshStandardMaterial({ color: 0x273647, roughness: 0.58, metalness: 0.12 }),
  );
  pedestal.position.y = 0.11;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.24, 0.018, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x77b9c8 }),
  );
  accentRing.position.y = 0.235;
  accentRing.rotation.x = Math.PI / 2;
  scene.add(accentRing);

  let currentAsset: THREE.Group | undefined;
  let currentDefinition: AssetDefinition = avatarAssets[0] as AssetDefinition;
  let currentChestBaseY = 3.02;

  function frameAsset(asset: THREE.Object3D): void {
    asset.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(asset);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const verticalDistance = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
    const horizontalFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.aspect);
    const horizontalDistance = size.x / (2 * Math.tan(horizontalFov * 0.5));
    // The angled camera projects a tall humanoid farther than the flat FOV formula suggests.
    // Keep generous head/boot breathing room so asynchronous GLB swaps never crop the face.
    const distance = Math.max(verticalDistance, horizontalDistance, size.z * 1.7) * 1.5;
    const direction = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    controls.update();
    viewportWrap.dataset.frame = `${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}@${distance.toFixed(2)}`;
    const sword = asset.getObjectByName("weapon.training-sword");
    const swordBounds = sword ? new THREE.Box3().setFromObject(sword) : undefined;
    viewportWrap.dataset.sword = swordBounds && !swordBounds.isEmpty()
      ? `${swordBounds.min.toArray().map((value) => value.toFixed(2)).join(",")}|${swordBounds.max.toArray().map((value) => value.toFixed(2)).join(",")}`
      : "missing";
  }

  function disposeObject(root: THREE.Object3D): void {
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    });
  }

  function showAsset(definition: AssetDefinition): void {
    if (currentAsset) {
      scene.remove(currentAsset);
      disposeObject(currentAsset);
    }
    currentDefinition = definition;
    const asset = definition.create();
    currentAsset = definition.category === "avatar"
      ? attachClassEquipmentPreview(asset as AvatarGroup)
      : asset;
    const initialChest = currentAsset.getObjectByName("chest");
    currentChestBaseY = initialChest?.position.y ?? 3.02;
    if (definition.category === "avatar") {
      const avatar = currentAsset as AvatarGroup;
      void avatar.userData.assetReady?.then(() => {
        if (currentAsset !== avatar) return;
        currentChestBaseY = avatar.userData.sculptRuntime.nodes.chest?.position.y ?? 0;
        viewportWrap.dataset.assetSource = avatar.userData.assetSource ?? "unknown";
        frameAsset(avatar);
      });
    }
    currentAsset.position.y = 0.24;
    if (definition.category === "weapon" || definition.category === "equipment") {
      currentAsset.rotation.set(0.04, -0.25, -0.28);
      currentAsset.scale.setScalar(1.32);
      controls.target.set(0, 1.45, 0);
    } else if (definition.category === "field") {
      currentAsset.scale.setScalar(definition.id === "field.grass-tuft" ? 2 : 1.15);
      controls.target.set(0, definition.id === "field.fantasy-tree" ? 2.0 : 1.05, 0);
    } else {
      controls.target.set(0, 2.4, 0);
    }
    scene.add(currentAsset);
    assetName.textContent = definition.label;
    assetKind.textContent = definition.category === "avatar" ? "CHARACTER" : definition.category.toUpperCase();
    list.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.getAttribute("data-id") === definition.id));
  }

  function renderList(definitions: readonly AssetDefinition[]): void {
    list.replaceChildren();
    definitions.forEach((definition, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = definition.id;
      button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${definition.label}</strong><em>VIEW</em>`;
      button.addEventListener("click", () => showAsset(definition));
      list.append(button);
    });
    showAsset(definitions[0] as AssetDefinition);
  }

  const categoryMap = { avatar: avatarAssets, equipment: equipmentAssets, field: fieldAssets } as const;
  app.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      app.querySelectorAll(".tab").forEach((candidate) => candidate.classList.toggle("is-active", candidate === tab));
      const category = tab.dataset.category as keyof typeof categoryMap;
      renderList(categoryMap[category]);
    });
  });

  const clock = new THREE.Clock();
  function resize(): void {
    const { width, height } = viewportWrap.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  function animate(): void {
    const elapsed = clock.getElapsedTime();
    if (currentAsset) {
      currentAsset.rotation.y = Math.sin(elapsed * 0.34) * 0.16;
      if (currentDefinition.category === "avatar") {
        const chest = currentAsset.getObjectByName("chest");
        if (chest) chest.position.y = currentChestBaseY + Math.sin(elapsed * 1.65) * 0.014;
        const hair = currentAsset.getObjectByName("hair");
        if (hair) hair.rotation.z = Math.sin(elapsed * 1.15) * 0.015;
      }
    }
    if (accentRing.material instanceof THREE.MeshBasicMaterial) {
      accentRing.material.color.setHSL(0.52 + Math.sin(elapsed * 0.4) * 0.025, 0.48, 0.62);
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  new ResizeObserver(resize).observe(viewportWrap);
  renderList(avatarAssets);
  resize();
  animate();

  window.addEventListener("beforeunload", () => {
    if (currentAsset) disposeObject(currentAsset);
    renderer.dispose();
  });

  // 카탈로그의 tree-shaking 방지를 위한 개발 중 정합성 확인이다.
  if (assetCatalog.length !== 15) throw new Error("Asset catalog count is out of sync");
}
