import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { assetCatalog, avatarAssets, creatureAssets, equipmentAssets, faunaAssets, fieldAssets, npcAssets, worldPropAssets } from "../assets/catalog";
import type { AssetDefinition, AvatarGroup } from "../assets/types";
import { attachClassEquipmentPreview } from "./attachClassEquipmentPreview";

const ITEM_CATEGORIES = new Set<AssetDefinition["category"]>(["weapon", "outfit", "head", "accessory", "equipment"]);

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

export function startAssetGallery(): void {
  const appNode = document.querySelector<HTMLElement>("#app");
  if (!appNode) throw new Error("#app root is missing");
  const app: HTMLElement = appNode;

  app.innerHTML = `
    <section class="atelier" aria-label="MMORPG 리소스 갤러리">
      <header class="brand">
        <p class="eyebrow">IMG2THREEJS · ASSET ATELIER</p>
        <h1>대륙 리소스 도감</h1>
        <p>동물 208종, 몬스터 96종, 월드 소품 96종을 포함한 절차형 MMORPG 리소스 655종이다.</p>
      </header>
      <div class="viewport-wrap">
        <canvas class="viewport" aria-label="선택한 3D 리소스 미리보기"></canvas>
        <div class="view-hint">드래그 회전 · 휠 확대</div>
        <div class="asset-badge"><span id="asset-kind">CHARACTER</span><strong id="asset-name">여성형 전사</strong></div>
      </div>
      <aside class="catalog-panel">
        <div class="tabs" role="tablist" aria-label="리소스 종류">
          <button class="tab is-active" data-category="avatar" type="button">캐릭터 <small>${String(avatarAssets.length).padStart(2, "0")}</small></button>
          <button class="tab" data-category="npc" type="button">NPC <small>${String(npcAssets.length).padStart(2, "0")}</small></button>
          <button class="tab" data-category="fauna" type="button">동물 <small>${faunaAssets.length}</small></button>
          <button class="tab" data-category="creature" type="button">몬스터 <small>${creatureAssets.length}</small></button>
          <button class="tab" data-category="equipment" type="button">아이템 <small>${equipmentAssets.length}</small></button>
          <button class="tab" data-category="world" type="button">월드 <small>${worldPropAssets.length + fieldAssets.length}</small></button>
        </div>
        <label class="catalog-search">
          <span>리소스 검색</span>
          <input id="asset-search" type="search" placeholder="이름, ID, 태그" autocomplete="off">
        </label>
        <div id="asset-list" class="asset-list"></div>
        <footer>
          <span><i class="dot dot-blue"></i> ORIGINAL PROCEDURAL</span>
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
  const search = requiredElement<HTMLInputElement>("#asset-search");
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
  controls.minDistance = 2.4;
  controls.maxDistance = 18;
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
  const fill = new THREE.DirectionalLight(0xeaf4ff, 1.45);
  fill.position.set(-1, 3.5, 8);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: 0x1a2531, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.6, 0.22, 32), new THREE.MeshStandardMaterial({ color: 0x273647, roughness: 0.58, metalness: 0.12 }));
  pedestal.position.y = 0.11;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  const accentRing = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.018, 8, 64), new THREE.MeshBasicMaterial({ color: 0x77b9c8 }));
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
    const distance = Math.max(verticalDistance, horizontalDistance, size.z * 1.7) * 1.5;
    const direction = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    controls.update();
    viewportWrap.dataset.frame = `${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}@${distance.toFixed(2)}`;
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
      : createWearablePreview(definition, asset);
    currentChestBaseY = currentAsset.getObjectByName("chest")?.position.y ?? 3.02;

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
    if (definition.category === "outfit" || definition.category === "head") {
      currentAsset.rotation.set(0, -0.3, 0);
      currentAsset.scale.setScalar(1.15);
    } else if (ITEM_CATEGORIES.has(definition.category)) {
      currentAsset.rotation.set(0.12, -0.42, -0.18);
      currentAsset.scale.setScalar(1.25);
    } else if (definition.category === "field") {
      currentAsset.scale.setScalar(definition.id === "field.grass-tuft" ? 2 : 1.15);
    } else if (definition.category === "fauna" || definition.category === "creature" || definition.category === "world") {
      currentAsset.scale.setScalar(1.08);
    }
    scene.add(currentAsset);
    frameAsset(currentAsset);
    assetName.textContent = definition.label;
    assetKind.textContent = isCharacterAsset(definition)
      ? definition.category.toUpperCase()
      : ITEM_CATEGORIES.has(definition.category)
        ? `ITEM · ${definition.category.toUpperCase()}`
        : definition.category.toUpperCase();
    list.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.getAttribute("data-id") === definition.id));
  }

  function renderList(definitions: readonly AssetDefinition[]): void {
    list.replaceChildren();
    if (definitions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "asset-list-empty";
      empty.textContent = "검색 결과가 없다.";
      list.append(empty);
      return;
    }
    definitions.forEach((definition, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = definition.id;
      button.innerHTML = `<span>${String(index + 1).padStart(3, "0")}</span><strong>${definition.label}</strong><em>VIEW</em>`;
      button.addEventListener("click", () => showAsset(definition));
      list.append(button);
    });
    showAsset(definitions[0] as AssetDefinition);
  }

  const categoryMap = {
    avatar: avatarAssets,
    npc: npcAssets,
    fauna: faunaAssets,
    creature: creatureAssets,
    equipment: equipmentAssets,
    world: [...worldPropAssets, ...fieldAssets],
  } as const;
  let activeCategory: keyof typeof categoryMap = "avatar";

  function filterActiveCategory(): void {
    const query = search.value.trim().toLocaleLowerCase("ko-KR");
    const definitions = categoryMap[activeCategory].filter((definition) => {
      const haystack = [definition.label, definition.id, ...(definition.tags ?? [])].join(" ").toLocaleLowerCase("ko-KR");
      return haystack.includes(query);
    });
    renderList(definitions);
  }

  search.addEventListener("input", filterActiveCategory);
  app.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      app.querySelectorAll(".tab").forEach((candidate) => candidate.classList.toggle("is-active", candidate === tab));
      activeCategory = tab.dataset.category as keyof typeof categoryMap;
      search.value = "";
      filterActiveCategory();
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
      if (isCharacterAsset(currentDefinition)) {
        const chest = currentAsset.getObjectByName("chest");
        if (chest) chest.position.y = currentChestBaseY + Math.sin(elapsed * 1.65) * 0.014;
        const hair = currentAsset.getObjectByName("hair");
        if (hair) hair.rotation.z = Math.sin(elapsed * 1.15) * 0.015;
      }
    }
    if (accentRing.material instanceof THREE.MeshBasicMaterial) accentRing.material.color.setHSL(0.52 + Math.sin(elapsed * 0.4) * 0.025, 0.48, 0.62);
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

  if (assetCatalog.length !== 655) throw new Error("Asset catalog count is out of sync");
}
