import * as THREE from "three";
import { capsule, collectNamedNodes, extrudedShape, loftedLock, mesh } from "../geometry";
import { CLASS_PALETTES, COMMON_COLORS, metal, standard, toon } from "../materials";
import type { AvatarGroup, AvatarOptions, AvatarOutfitId, SculptRuntime } from "../types";

const HAIR_COLORS = {
  feminine: { warrior: 0x51342f, mage: 0x514376, ranger: 0x8a4d37 },
  masculine: { warrior: 0x382a27, mage: 0x26334c, ranger: 0x304a39 },
} as const;

type Point3 = readonly [number, number, number];

function createHeroHeadGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(0.5, 40, 30);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const sourceX = positions.getX(index);
    const sourceY = positions.getY(index);
    const sourceZ = positions.getZ(index);
    const chinFactor = sourceY < -0.08
      ? THREE.MathUtils.lerp(1, 0.68, THREE.MathUtils.clamp((-sourceY - 0.08) / 0.42, 0, 1))
      : 1;
    const templeFactor = sourceY > 0.3
      ? THREE.MathUtils.lerp(1, 0.9, THREE.MathUtils.clamp((sourceY - 0.3) / 0.2, 0, 1))
      : 1;
    positions.setXYZ(
      index,
      sourceX * 0.86 * chinFactor * templeFactor,
      sourceY * 0.98,
      sourceZ * (sourceZ > 0 ? 0.76 : 0.88) - 0.015,
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.name = "hero.feminine-warrior.head-volume";
  return geometry;
}

function createFittedTorsoGeometry(): THREE.BufferGeometry {
  const profile = [
    new THREE.Vector2(0.36, -0.62),
    new THREE.Vector2(0.37, -0.5),
    new THREE.Vector2(0.39, -0.28),
    new THREE.Vector2(0.43, 0.02),
    new THREE.Vector2(0.48, 0.28),
    new THREE.Vector2(0.51, 0.46),
    new THREE.Vector2(0.32, 0.61),
  ];
  const geometry = new THREE.LatheGeometry(profile, 28);
  geometry.name = "hero.feminine-warrior.fitted-torso";
  return geometry;
}

function curvedStroke(
  name: string,
  points: readonly Point3[],
  radius: number,
  material: THREE.Material,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return mesh(name, new THREE.TubeGeometry(curve, 10, radius, 5, false), material);
}

function addHeroFemaleWarriorFace(head: THREE.Group): void {
  const skin = new THREE.MeshStandardMaterial({ color: COMMON_COLORS.skin, roughness: 0.72 });
  const skinShade = new THREE.MeshStandardMaterial({ color: COMMON_COLORS.skinShade, roughness: 0.76 });
  const dark = new THREE.MeshStandardMaterial({ color: COMMON_COLORS.eyeDark, roughness: 0.42 });
  const white = new THREE.MeshStandardMaterial({ color: COMMON_COLORS.eyeWhite, roughness: 0.36 });
  const iris = new THREE.MeshStandardMaterial({ color: 0x4f855b, roughness: 0.26 });

  head.add(mesh("face", createHeroHeadGeometry(), skin));
  head.add(mesh("ear.L", new THREE.SphereGeometry(0.075, 14, 10), skinShade, [0.43, -0.005, -0.015], [0.5, 1, 0.48]));
  head.add(mesh("ear.R", new THREE.SphereGeometry(0.075, 14, 10), skinShade, [-0.43, -0.005, -0.015], [0.5, 1, 0.48]));

  for (const [side, x] of [["L", 0.15], ["R", -0.15]] as const) {
    head.add(mesh(`eye.${side}.outline`, new THREE.SphereGeometry(0.078, 20, 12), dark, [x, 0.055, 0.374], [1.22, 0.5, 0.16]));
    head.add(mesh(`eye.${side}.white`, new THREE.SphereGeometry(0.067, 20, 12), white, [x, 0.055, 0.386], [1.18, 0.47, 0.13]));
    head.add(mesh(`eye.${side}.iris`, new THREE.SphereGeometry(0.034, 16, 10), iris, [x, 0.051, 0.397], [0.92, 0.94, 0.1]));
    head.add(mesh(`eye.${side}.pupil`, new THREE.SphereGeometry(0.014, 12, 8), dark, [x, 0.051, 0.404], [0.8, 0.94, 0.08]));
    head.add(mesh(`eye.${side}.catchlight`, new THREE.SphereGeometry(0.007, 8, 6), white, [x + 0.012, 0.063, 0.411]));
    head.add(curvedStroke(`eye.${side}.upper-lash`, [
      [x - 0.075, 0.092, 0.407],
      [x, 0.11, 0.415],
      [x + 0.075, 0.092, 0.407],
    ], 0.008, dark));
    head.add(curvedStroke(`brow.${side}`, [
      [x - 0.065, 0.17, 0.392],
      [x, 0.184, 0.399],
      [x + 0.065, 0.168, 0.392],
    ], 0.007, dark));
  }

  head.add(mesh("nose", new THREE.TetrahedronGeometry(0.025, 0), skinShade, [0, -0.06, 0.405], [0.56, 1, 0.38]));
  head.add(curvedStroke("mouth", [[-0.045, -0.185, 0.385], [0, -0.195, 0.394], [0.045, -0.185, 0.385]], 0.006, new THREE.MeshStandardMaterial({ color: 0xa45a5b, roughness: 0.68 })));
}

function addFace(head: THREE.Group, options: AvatarOptions): void {
  if (options.body === "feminine" && options.classId === "warrior") {
    addHeroFemaleWarriorFace(head);
    return;
  }
  const skin = toon(COMMON_COLORS.skin);
  const skinShade = toon(COMMON_COLORS.skinShade);
  const dark = toon(COMMON_COLORS.eyeDark);
  const white = toon(COMMON_COLORS.eyeWhite);
  const iris = toon({ warrior: 0x58815d, mage: 0x70649b, ranger: 0x6f7f52 }[options.classId]);

  head.add(mesh("face", new THREE.SphereGeometry(0.5, 32, 22), skin, [0, 0, 0], [0.88, 1.03, 0.84]));
  head.add(mesh("ear.L", new THREE.SphereGeometry(0.09, 10, 8), skinShade, [0.45, -0.02, 0], [0.52, 1, 0.42]));
  head.add(mesh("ear.R", new THREE.SphereGeometry(0.09, 10, 8), skinShade, [-0.45, -0.02, 0], [0.52, 1, 0.42]));

  for (const [side, x] of [["L", 0.17], ["R", -0.17]] as const) {
    head.add(mesh(`eye.${side}.outline`, new THREE.CircleGeometry(0.083, 20), dark, [x, 0.045, 0.424], [1, 0.62, 1]));
    head.add(mesh(`eye.${side}.white`, new THREE.CircleGeometry(0.069, 20), white, [x, 0.047, 0.429], [1, 0.6, 1]));
    head.add(mesh(`eye.${side}.iris`, new THREE.CircleGeometry(0.036, 16), iris, [x, 0.039, 0.434], [0.86, 0.98, 1]));
    head.add(mesh(`eye.${side}.pupil`, new THREE.CircleGeometry(0.018, 12), dark, [x, 0.037, 0.439], [0.8, 1.04, 1]));
    head.add(mesh(`eye.${side}.catchlight`, new THREE.CircleGeometry(0.007, 8), white, [x + 0.011, 0.056, 0.444]));

    const brow = capsule(`brow.${side}`, 0.009, 0.105, dark);
    brow.position.set(x, 0.165, 0.425);
    brow.rotation.z = Math.PI / 2 + (side === "L" ? -0.08 : 0.08);
    head.add(brow);
  }

  head.add(mesh("nose", new THREE.SphereGeometry(0.022, 8, 6), skinShade, [0, -0.09, 0.445], [0.72, 1.05, 0.3]));
  const mouth = capsule("mouth", 0.007, 0.055, toon(0xa45a5b));
  mouth.position.set(0, -0.205, 0.432);
  mouth.rotation.z = Math.PI / 2;
  head.add(mouth);
}

function addLock(
  hair: THREE.Group,
  name: string,
  points: readonly Point3[],
  material: THREE.Material,
  rootWidth = 0.105,
  tipWidth = 0.018,
  thickness = 0.07,
): void {
  hair.add(loftedLock(name, points, rootWidth, tipWidth, thickness, material));
}

function addBraid(
  hair: THREE.Group,
  name: string,
  points: readonly Point3[],
  material: THREE.Material,
  scale = 1,
): void {
  points.forEach(([x, y, z], index) => {
    const bead = mesh(`${name}.${index + 1}`, new THREE.SphereGeometry(0.105 * scale, 10, 8), material, [x, y, z], [0.8, 1.18, 0.72]);
    bead.rotation.z = (index % 2 === 0 ? 1 : -1) * 0.26;
    hair.add(bead);
  });
}

function addBangs(hair: THREE.Group, material: THREE.Material, masculine: boolean): void {
  const roots = [-0.32, -0.17, 0, 0.17, 0.32];
  roots.forEach((x, index) => {
    const sway = (index - 2) * 0.025;
    const tipY = index === 2 ? 0.105 : masculine ? 0.16 : 0.145;
    addLock(hair, `hair.bang.${index + 1}`, [
      [x * 0.78, 0.43, 0.2],
      [x, 0.25, 0.39],
      [x + sway, tipY, 0.417],
    ], material, masculine ? 0.07 : 0.078, 0.012, 0.048);
  });
}

function addHeroFemaleWarriorHair(head: THREE.Group): void {
  const base = new THREE.MeshStandardMaterial({ color: 0x5c352b, roughness: 0.58 });
  const shadow = new THREE.MeshStandardMaterial({ color: 0x3d241f, roughness: 0.68 });
  const highlight = new THREE.MeshStandardMaterial({ color: 0x75473a, roughness: 0.52 });
  const tieMaterial = new THREE.MeshStandardMaterial({ color: 0x234f78, roughness: 0.48 });
  const hair = new THREE.Group();
  hair.name = "hair";
  hair.userData.variant = "feminine.warrior";
  hair.userData.reference = "female-warrior-turnaround-v1.png";
  hair.userData.qualityPass = "hero-female-warrior";

  hair.add(mesh("hair.crown-mass", new THREE.SphereGeometry(0.49, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.56), shadow, [0, 0.12, -0.075], [0.91, 1.02, 0.85]));
  hair.add(mesh("hair.fringe-mass", new THREE.SphereGeometry(0.46, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), base, [0, 0.18, 0.025], [0.91, 0.72, 0.82]));

  const bangs = [
    { x: -0.31, tipX: -0.34, tipY: 0.01, width: 0.09 },
    { x: -0.21, tipX: -0.2, tipY: 0.07, width: 0.105 },
    { x: -0.1, tipX: -0.075, tipY: 0.12, width: 0.105 },
    { x: 0.015, tipX: 0.02, tipY: 0.08, width: 0.11 },
    { x: 0.13, tipX: 0.11, tipY: 0.13, width: 0.1 },
    { x: 0.24, tipX: 0.22, tipY: 0.06, width: 0.1 },
    { x: 0.34, tipX: 0.36, tipY: 0.02, width: 0.085 },
  ];
  bangs.forEach(({ x, tipX, tipY, width }, index) => {
    addLock(hair, `hair.bang.${index + 1}`, [
      [x * 0.72, 0.47, 0.1],
      [x, 0.3, 0.32],
      [tipX, tipY, 0.395],
    ], index % 3 === 0 ? highlight : base, width, 0.012, 0.052);
  });

  for (const side of [-1, 1]) {
    const sideName = side < 0 ? "R" : "L";
    addLock(hair, `hair.temple.${sideName}.front`, [
      [side * 0.37, 0.35, 0.06],
      [side * 0.43, 0.08, 0.12],
      [side * 0.4, -0.34, 0.16],
      [side * 0.31, -0.55, 0.2],
    ], base, 0.105, 0.018, 0.065);
    addLock(hair, `hair.temple.${sideName}.rear`, [
      [side * 0.38, 0.32, -0.08],
      [side * 0.44, 0, -0.02],
      [side * 0.39, -0.38, 0.04],
    ], shadow, 0.1, 0.018, 0.07);
  }

  const tie = mesh("hair.ponytail.tie", new THREE.TorusGeometry(0.105, 0.028, 8, 20), tieMaterial, [0.08, 0.28, -0.45]);
  tie.rotation.x = Math.PI / 2;
  hair.add(tie);
  const ponyOffsets = [-0.24, -0.16, -0.08, 0, 0.09, 0.17, 0.25];
  ponyOffsets.forEach((offset, index) => {
    const outer = Math.abs(offset) > 0.18;
    addLock(hair, `hair.ponytail.${index + 1}`, [
      [0.08 + offset * 0.12, 0.25, -0.45],
      [0.2 + offset * 0.7, -0.12, -0.55],
      [0.28 + offset, -0.62, -0.51],
      [0.24 + offset * 0.78, -1.2 + (outer ? 0.08 : 0), -0.38],
      [0.12 + offset * 0.5, -1.68 + (index % 2) * 0.08, -0.23],
    ], index % 3 === 1 ? highlight : base, outer ? 0.13 : 0.155, 0.018, outer ? 0.085 : 0.105);
  });

  head.add(hair);
}

function addHair(head: THREE.Group, options: AvatarOptions): void {
  if (options.body === "feminine" && options.classId === "warrior") {
    addHeroFemaleWarriorHair(head);
    return;
  }
  const material = toon(HAIR_COLORS[options.body][options.classId]);
  const accent = toon(options.classId === "mage" ? 0xd2b75f : 0xd4b768);
  const hair = new THREE.Group();
  hair.name = "hair";
  hair.userData.variant = `${options.body}.${options.classId}`;
  hair.userData.reference = `${options.body}-${options.classId}-turnaround-v1.png`;
  hair.add(mesh("hair.crown-mass", new THREE.SphereGeometry(0.515, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), material, [0, 0.1, -0.12], [0.96, 1.02, 0.78]));
  addBangs(hair, material, options.body === "masculine");

  if (options.body === "feminine" && options.classId === "warrior") {
    for (const side of [-1, 1]) {
      addLock(hair, `hair.temple.${side < 0 ? "R" : "L"}`, [[side * 0.4, 0.28, 0.08], [side * 0.45, -0.08, 0.12], [side * 0.35, -0.48, 0.17]], material, 0.12, 0.02, 0.07);
    }
    const tie = mesh("hair.ponytail.tie", new THREE.TorusGeometry(0.105, 0.027, 7, 18), accent, [0, 0.17, -0.49]);
    tie.rotation.x = Math.PI / 2;
    hair.add(tie);
    [-0.17, -0.08, 0.02, 0.11, 0.19].forEach((x, index) => {
      addLock(hair, `hair.ponytail.${index + 1}`, [[x * 0.35, 0.13, -0.49], [x, -0.42, -0.56], [x * 0.65 + 0.08, -1.18, -0.48], [x * 0.2 - 0.03, -1.7 + index * 0.025, -0.34]], material, 0.14, 0.025, 0.1);
    });
  } else if (options.body === "feminine" && options.classId === "mage") {
    for (const side of [-1, 1]) {
      for (let index = 0; index < 3; index += 1) {
        const x = side * (0.28 + index * 0.07);
        addLock(hair, `hair.wave.${side < 0 ? "R" : "L"}.${index + 1}`, [[x * 0.75, 0.35, 0.02], [x, 0.02, side * 0.025], [x + side * 0.04, -0.48, 0.02], [x - side * 0.03, -0.82, 0.13]], material, 0.12, 0.025, 0.085);
      }
    }
    addBraid(hair, "hair.braid", [[-0.34, -0.36, -0.34], [-0.37, -0.57, -0.36], [-0.34, -0.77, -0.35], [-0.38, -0.97, -0.32], [-0.34, -1.15, -0.28]], material, 0.8);
    const crescent = mesh("hair.crescent", new THREE.TorusGeometry(0.12, 0.022, 7, 22, Math.PI * 1.35), accent, [0.31, 0.27, 0.37]);
    crescent.rotation.z = 0.65;
    hair.add(crescent);
  } else if (options.body === "feminine") {
    for (const side of [-1, 1]) {
      for (let index = 0; index < 3; index += 1) {
        const x = side * (0.25 + index * 0.08);
        addLock(hair, `hair.bob.${side < 0 ? "R" : "L"}.${index + 1}`, [[x * 0.75, 0.34, 0.04], [x, 0.03, 0.08], [x + side * 0.03, -0.38, 0.13], [x - side * 0.04, -0.62 + index * 0.03, 0.2]], material, 0.115, 0.02, 0.075);
      }
    }
    addBraid(hair, "hair.side-braid", [[0.39, -0.23, 0.07], [0.43, -0.4, 0.1], [0.4, -0.57, 0.13], [0.43, -0.72, 0.16]], material, 0.62);
  } else if (options.classId === "ranger") {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 0.37;
      const z = Math.sin(angle) * 0.29 - 0.05;
      addLock(hair, `hair.layer.${index + 1}`, [[x * 0.75, 0.38, z * 0.7], [x, 0.17, z], [x * 1.08, -0.18 - (index % 2) * 0.08, z + 0.05]], material, 0.105, 0.02, 0.07);
    }
    const tie = mesh("hair.rear-tie.band", new THREE.TorusGeometry(0.075, 0.022, 6, 14), accent, [0, -0.08, -0.48]);
    tie.rotation.x = Math.PI / 2;
    hair.add(tie);
    for (const x of [-0.08, 0.08]) {
      addLock(hair, `hair.rear-tie.${x < 0 ? "R" : "L"}`, [[x * 0.2, -0.1, -0.48], [x, -0.37, -0.53], [x * 0.55, -0.67, -0.48]], material, 0.09, 0.018, 0.06);
    }
  } else {
    const count = options.classId === "mage" ? 10 : 9;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const x = Math.cos(angle) * 0.34;
      const z = Math.sin(angle) * 0.29 - 0.02;
      const lift = index % 2 === 0 ? 0.1 : 0.02;
      addLock(hair, `hair.spike.${index + 1}`, [[x * 0.65, 0.42, z * 0.65], [x, 0.27, z], [x * 1.18, -0.02 + lift, z * 1.18]], material, 0.11, 0.02, 0.075);
    }
  }

  head.add(hair);
}

function createLimb(
  name: string,
  upperLength: number,
  lowerLength: number,
  radius: number,
  upperMaterial: THREE.Material,
  endName: string,
  lowerMaterial: THREE.Material,
  endMaterial: THREE.Material,
): THREE.Group {
  const upper = new THREE.Group();
  upper.name = `${name}.upper`;
  const upperMesh = capsule(`${name}.upper.mesh`, radius, upperLength - radius * 1.45, upperMaterial);
  upperMesh.position.y = -upperLength / 2 + radius * 0.08;
  upperMesh.scale.set(1, 1, 0.9);
  upper.add(upperMesh);

  const lower = new THREE.Group();
  lower.name = `${name}.lower`;
  lower.position.y = -upperLength + radius * 0.18;
  const lowerMesh = capsule(`${name}.lower.mesh`, radius * 0.88, lowerLength - radius * 1.25, lowerMaterial);
  lowerMesh.position.y = -lowerLength / 2 + radius * 0.05;
  lowerMesh.scale.set(0.94, 1, 0.88);
  lower.add(lowerMesh);
  upper.add(lower);

  const end = new THREE.Group();
  end.name = endName;
  end.position.y = -lowerLength + radius * 0.15;
  end.add(mesh(`${endName}.mesh`, new THREE.CapsuleGeometry(radius * 0.72, radius * 0.55, 5, 9), endMaterial, [0, -radius * 0.22, 0], [0.82, 1.06, 0.68]));
  lower.add(end);
  return upper;
}

function addBelt(root: THREE.Group, name: string, y: number, accent: number): void {
  const belt = mesh(`${name}.belt`, new THREE.TorusGeometry(0.49, 0.045, 7, 24), standard(COMMON_COLORS.leather, 0.83), [0, y, 0], [1.04, 1, 0.82]);
  belt.rotation.x = Math.PI / 2;
  root.add(belt);
  root.add(mesh(`${name}.buckle`, new THREE.BoxGeometry(0.15, 0.13, 0.055), metal(accent), [0, y, 0.43]));
}

function addHeroFemaleWarriorOutfit(root: THREE.Group, torso: THREE.Group, palette: typeof CLASS_PALETTES.warrior): void {
  const primary = new THREE.MeshStandardMaterial({ color: palette.primary, roughness: 0.74 });
  const primaryShadow = new THREE.MeshStandardMaterial({ color: palette.dark, roughness: 0.78 });
  const cream = new THREE.MeshStandardMaterial({ color: palette.secondary, roughness: 0.8 });
  const leather = new THREE.MeshStandardMaterial({ color: COMMON_COLORS.leather, roughness: 0.82 });
  const leatherLight = new THREE.MeshStandardMaterial({ color: COMMON_COLORS.leatherLight, roughness: 0.78 });

  torso.add(mesh("outfit.warrior.tunic", createFittedTorsoGeometry(), primary, [0, -0.04, 0], [1, 1, 0.77]));
  const centerInset = extrudedShape("outfit.warrior.inset", [[-0.12, 0.49], [0.12, 0.49], [0.1, -0.46], [0, -0.56], [-0.1, -0.46]], 0.022, primaryShadow, 0.01);
  centerInset.position.z = 0.392;
  torso.add(centerInset);
  for (const side of [-1, 1]) {
    const sideName = side < 0 ? "R" : "L";
    const collar = mesh(`outfit.warrior.collar.${sideName}`, new THREE.BoxGeometry(0.055, 0.5, 0.028), cream, [side * 0.12, 0.31, 0.405]);
    collar.rotation.z = side * -0.48;
    torso.add(collar);

    const border = extrudedShape(`outfit.warrior.skirt-border.${sideName}`, [
      [side * 0.025, 2.55], [side * 0.52, 2.5], [side * 0.57, 1.66], [side * 0.1, 1.55],
    ], 0.065, cream, 0.016);
    border.position.z = 0.1;
    root.add(border);
    const panel = extrudedShape(`outfit.warrior.skirt.${sideName}`, [
      [side * 0.055, 2.51], [side * 0.47, 2.46], [side * 0.5, 1.74], [side * 0.13, 1.65],
    ], 0.072, primary, 0.014);
    panel.position.z = 0.145;
    root.add(panel);
  }
  const backBorder = mesh("outfit.warrior.skirt.back-border", new THREE.BoxGeometry(1.02, 0.78, 0.075), cream, [0, 2.08, -0.31]);
  root.add(backBorder);
  root.add(mesh("outfit.warrior.skirt.back", new THREE.BoxGeometry(0.96, 0.69, 0.082), primary, [0, 2.12, -0.35]));

  addBelt(root, "outfit.warrior", 2.43, palette.accent);
  root.add(mesh("outfit.warrior.belt-keeper.L", new THREE.BoxGeometry(0.055, 0.17, 0.07), leatherLight, [0.26, 2.43, 0.42]));
  root.add(mesh("outfit.warrior.belt-keeper.R", new THREE.BoxGeometry(0.055, 0.17, 0.07), leatherLight, [-0.26, 2.43, 0.42]));
  const pouch = mesh("outfit.warrior.pouch", new THREE.CapsuleGeometry(0.15, 0.16, 5, 12), leather, [0.5, 2.16, 0.04], [1, 1, 0.56]);
  pouch.rotation.z = -0.05;
  root.add(pouch);
  root.add(mesh("outfit.warrior.pouch-flap", new THREE.BoxGeometry(0.28, 0.13, 0.045), leatherLight, [0.5, 2.29, 0.13]));

  const strap = mesh("outfit.warrior.strap", new THREE.BoxGeometry(0.078, 1.48, 0.045), leather, [0, 0.03, 0.42]);
  strap.rotation.z = -0.52;
  torso.add(strap);
  torso.add(mesh("outfit.warrior.strap-buckle", new THREE.TorusGeometry(0.075, 0.014, 6, 16), metal(0xb58d48), [-0.25, 0.29, 0.45]));

  const pauldron = mesh("outfit.warrior.pauldron", new THREE.SphereGeometry(0.34, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), metal(0xaeb8be), [0.57, 0.4, -0.005], [1, 0.52, 0.96]);
  torso.add(pauldron);
  const lowerPlate = mesh("outfit.warrior.pauldron.lower", new THREE.SphereGeometry(0.3, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal(0x8f9aa2), [0.58, 0.32, 0], [1, 0.42, 0.92]);
  torso.add(lowerPlate);
  for (const [index, z] of [-0.16, 0, 0.16].entries()) {
    torso.add(mesh(`outfit.warrior.pauldron.rivet.${index + 1}`, new THREE.SphereGeometry(0.022, 8, 6), metal(0x5e6870), [0.65, 0.38, z]));
  }
}

function addWarriorOutfit(
  root: THREE.Group,
  torso: THREE.Group,
  palette: typeof CLASS_PALETTES.warrior,
  heroFeminine = false,
): void {
  if (heroFeminine) {
    addHeroFemaleWarriorOutfit(root, torso, palette);
    return;
  }
  const primary = toon(palette.primary);
  const dark = toon(palette.dark);
  const cream = toon(palette.secondary);
  const leather = standard(COMMON_COLORS.leather, 0.82);
  torso.add(mesh("outfit.warrior.tunic", new THREE.CylinderGeometry(0.52, 0.41, 1.2, 24), primary, [0, -0.08, 0], [1, 1, 0.78]));
  const inset = extrudedShape("outfit.warrior.inset", [[-0.17, 0.45], [0.17, 0.45], [0.13, -0.45], [0, -0.57], [-0.13, -0.45]], 0.025, dark, 0.012);
  inset.position.z = 0.43;
  torso.add(inset);
  for (const side of [-1, 1]) {
    const collar = mesh(`outfit.warrior.collar.${side}`, new THREE.BoxGeometry(0.06, 0.48, 0.035), cream, [side * 0.13, 0.28, 0.45]);
    collar.rotation.z = side * -0.48;
    torso.add(collar);
    const skirt = extrudedShape(`outfit.warrior.skirt.${side}`, [[side * 0.03, 2.55], [side * 0.52, 2.5], [side * 0.6, 1.75], [side * 0.12, 1.64]], 0.08, primary, 0.02);
    skirt.position.z = 0.08;
    root.add(skirt);
  }
  root.add(mesh("outfit.warrior.skirt.back", new THREE.BoxGeometry(0.96, 0.7, 0.07), primary, [0, 2.1, -0.34]));
  addBelt(root, "outfit.warrior", 2.42, palette.accent);
  root.add(mesh("outfit.warrior.pouch", new THREE.BoxGeometry(0.31, 0.36, 0.17, 2, 2, 1), leather, [0.49, 2.16, 0.05]));
  const strap = mesh("outfit.warrior.strap", new THREE.BoxGeometry(0.085, 1.45, 0.05), leather, [0, 0.02, 0.47]);
  strap.rotation.z = -0.5;
  torso.add(strap);
  const pauldron = mesh("outfit.warrior.pauldron", new THREE.SphereGeometry(0.39, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal(0xaeb8be), [0.66, 0.41, -0.01], [1, 0.62, 1.02]);
  torso.add(pauldron);
  torso.add(mesh("outfit.warrior.pauldron.rim", new THREE.TorusGeometry(0.32, 0.025, 6, 20, Math.PI), metal(0x65717a), [0.66, 0.38, 0.14], [1, 0.72, 1]));
}

function addMageOutfit(root: THREE.Group, torso: THREE.Group, palette: typeof CLASS_PALETTES.mage): void {
  const primary = toon(palette.primary);
  const dark = toon(palette.dark);
  const cream = toon(palette.secondary);
  const gold = metal(palette.accent);
  torso.add(mesh("outfit.mage.bodice", new THREE.CylinderGeometry(0.51, 0.4, 1.22, 24), primary, [0, -0.1, 0], [1, 1, 0.78]));
  const mantle = mesh("outfit.mage.mantle", new THREE.TorusGeometry(0.43, 0.13, 9, 28), dark, [0, 0.37, -0.01], [1.32, 0.58, 0.76]);
  torso.add(mantle);
  const hood = mesh("outfit.mage.hood", new THREE.TorusGeometry(0.39, 0.105, 9, 24, Math.PI * 1.55), dark, [0, 0.47, -0.05], [1, 1, 0.76]);
  hood.rotation.z = -Math.PI * 0.27;
  torso.add(hood);
  const collar = mesh("outfit.mage.collar", new THREE.TorusGeometry(0.35, 0.04, 7, 22), cream, [0, 0.43, 0.04], [1, 1, 0.72]);
  collar.rotation.x = Math.PI / 2;
  torso.add(collar);
  torso.add(mesh("outfit.mage.clasp", new THREE.OctahedronGeometry(0.095, 0), gold, [0, 0.23, 0.49], [0.75, 1.15, 0.42]));

  for (const side of [-1, 1]) {
    const front = extrudedShape(`outfit.mage.robe.front.${side}`, [[side * 0.02, 2.48], [side * 0.5, 2.48], [side * 0.69, 0.43], [side * 0.16, 0.62]], 0.075, primary, 0.02);
    front.position.z = 0.27;
    root.add(front);
    const trim = mesh(`outfit.mage.robe.trim.${side}`, new THREE.BoxGeometry(0.055, 1.9, 0.04), cream, [side * 0.29, 1.48, 0.355]);
    trim.rotation.z = side * -0.13;
    root.add(trim);
  }
  const rear = extrudedShape("outfit.mage.robe.rear", [[-0.52, 2.48], [0.52, 2.48], [0.78, 0.4], [0, 0.18], [-0.78, 0.4]], 0.08, dark, 0.025);
  rear.position.z = -0.36;
  root.add(rear);
  addBelt(root, "outfit.mage", 2.38, palette.accent);
  root.add(mesh("outfit.mage.pouch", new THREE.BoxGeometry(0.3, 0.36, 0.16), standard(COMMON_COLORS.leather, 0.82), [0.48, 2.13, 0.02]));
}

function addRangerOutfit(root: THREE.Group, torso: THREE.Group, palette: typeof CLASS_PALETTES.ranger): void {
  const primary = toon(palette.primary);
  const dark = toon(palette.dark);
  const tan = toon(palette.secondary);
  const leather = standard(COMMON_COLORS.leather, 0.84);
  torso.add(mesh("outfit.ranger.tunic", new THREE.CylinderGeometry(0.51, 0.4, 1.2, 24), primary, [0, -0.1, 0], [1, 1, 0.78]));
  const hood = mesh("outfit.ranger.hood", new THREE.TorusGeometry(0.4, 0.11, 8, 24, Math.PI * 1.55), dark, [0, 0.47, -0.05], [1, 1, 0.78]);
  hood.rotation.z = -Math.PI * 0.27;
  torso.add(hood);
  const cape = extrudedShape("outfit.ranger.cape", [[-0.52, 0.43], [0.52, 0.43], [0.57, -0.72], [0, -1.02], [-0.57, -0.72]], 0.075, dark, 0.025);
  cape.position.set(0, 0.18, -0.44);
  torso.add(cape);
  const panel = extrudedShape("outfit.ranger.chest-panel", [[-0.22, 0.35], [0.22, 0.35], [0.18, -0.43], [0, -0.57], [-0.18, -0.43]], 0.03, tan, 0.012);
  panel.position.z = 0.43;
  torso.add(panel);
  for (const side of [-1, 1]) {
    const coat = extrudedShape(`outfit.ranger.coat.${side}`, [[side * 0.04, 2.5], [side * 0.5, 2.46], [side * 0.58, 1.48], [side * 0.12, 1.6]], 0.075, primary, 0.02);
    coat.position.z = 0.17;
    root.add(coat);
  }
  addBelt(root, "outfit.ranger", 2.4, palette.accent);
  const strap = mesh("outfit.ranger.strap", new THREE.BoxGeometry(0.08, 1.45, 0.05), leather, [0, 0.02, 0.47]);
  strap.rotation.z = 0.48;
  torso.add(strap);
  root.add(mesh("outfit.ranger.pouch", new THREE.BoxGeometry(0.31, 0.36, 0.17), leather, [-0.48, 2.14, 0.04]));
}

function addTravelerOutfit(root: THREE.Group, torso: THREE.Group): void {
  const coat = toon(0x3f6f78);
  const dark = toon(0x28464d);
  const lining = toon(0xd2b67a);
  const leather = standard(COMMON_COLORS.leather, 0.84);
  torso.add(mesh("outfit.traveler.coat", new THREE.CylinderGeometry(0.51, 0.4, 1.2, 24), coat, [0, -0.1, 0], [1, 1, 0.78]));
  for (const side of [-1, 1]) {
    const lapel = mesh(`outfit.traveler.lapel.${side}`, new THREE.BoxGeometry(0.075, 0.68, 0.04), lining, [side * 0.12, 0.12, 0.45]);
    lapel.rotation.z = side * -0.4;
    torso.add(lapel);
    const tail = extrudedShape(`outfit.traveler.tail.${side}`, [[side * 0.03, 2.5], [side * 0.5, 2.45], [side * 0.62, 1.46], [side * 0.12, 1.58]], 0.075, coat, 0.02);
    tail.position.z = 0.12;
    root.add(tail);
  }
  const scarf = mesh("outfit.traveler.scarf", new THREE.TorusGeometry(0.36, 0.075, 8, 22), lining, [0, 0.48, 0], [1, 1, 0.76]);
  scarf.rotation.x = Math.PI / 2;
  torso.add(scarf);
  root.add(mesh("outfit.traveler.tail.back", new THREE.BoxGeometry(1.02, 0.95, 0.075), dark, [0, 1.98, -0.34]));
  addBelt(root, "outfit.traveler", 2.4, 0xb79a59);
  root.add(mesh("outfit.traveler.satchel", new THREE.BoxGeometry(0.39, 0.46, 0.19), leather, [-0.5, 2.02, 0.02]));
}

export interface AvatarOutfitVisual {
  readonly root: THREE.Group;
  readonly chest: THREE.Group;
}

export function getDefaultAvatarOutfitId(classId: AvatarOptions["classId"]): AvatarOutfitId {
  return `outfit.${classId}-starter`;
}

export function createAvatarOutfitVisual(
  outfitId: AvatarOutfitId,
  body?: AvatarOptions["body"],
): AvatarOutfitVisual {
  const root = new THREE.Group();
  root.name = `${outfitId}.root`;
  const chest = new THREE.Group();
  chest.name = `${outfitId}.chest`;

  if (outfitId === "outfit.traveler") addTravelerOutfit(root, chest);
  else if (outfitId === "outfit.warrior-starter") addWarriorOutfit(root, chest, CLASS_PALETTES.warrior, body === "feminine");
  else if (outfitId === "outfit.mage-starter") addMageOutfit(root, chest, CLASS_PALETTES.mage);
  else addRangerOutfit(root, chest, CLASS_PALETTES.ranger);

  return { root, chest };
}

export function createAnimeAvatar(options: AvatarOptions): AvatarGroup {
  const root = new THREE.Group() as AvatarGroup;
  root.name = "root";
  const heroFemaleWarrior = options.body === "feminine" && options.classId === "warrior";
  const palette = CLASS_PALETTES[options.classId];
  const skin = heroFemaleWarrior
    ? new THREE.MeshStandardMaterial({ color: COMMON_COLORS.skin, roughness: 0.72 })
    : toon(COMMON_COLORS.skin);
  const undersuit = toon(options.classId === "mage" ? palette.dark : 0x3f3b3b);
  const sleeve = toon(options.classId === "warrior" ? palette.primary : palette.dark);
  const bootMaterial = standard(COMMON_COLORS.leather, 0.82);
  const gloveMaterial = standard(options.classId === "mage" ? 0x373047 : COMMON_COLORS.leather, 0.78);
  const shoulderX = options.body === "masculine" ? 0.61 : heroFemaleWarrior ? 0.54 : 0.55;
  const hipX = options.body === "feminine" ? heroFemaleWarrior ? 0.27 : 0.29 : 0.27;

  const pelvis = new THREE.Group();
  pelvis.name = "pelvis";
  pelvis.position.y = heroFemaleWarrior ? 2.28 : 2.24;
  pelvis.add(mesh("pelvis.mesh", new THREE.SphereGeometry(heroFemaleWarrior ? 0.43 : 0.46, 20, 14), undersuit, [0, 0, 0], [options.body === "feminine" ? 1.12 : 1, heroFemaleWarrior ? 0.7 : 0.66, 0.74]));
  root.add(pelvis);

  const torso = new THREE.Group();
  torso.name = "chest";
  torso.position.y = 3.15;
  const chestRadius = options.body === "masculine" ? 0.47 : 0.43;
  torso.add(heroFemaleWarrior
    ? mesh("chest.mesh", createFittedTorsoGeometry(), undersuit, [0, -0.04, 0], [1.05, 1, 0.76])
    : mesh("chest.mesh", new THREE.CapsuleGeometry(chestRadius, 0.48, 8, 16), undersuit, [0, -0.05, 0], [options.body === "masculine" ? 1.08 : 1, 1, 0.82]));
  root.add(torso);

  const back = new THREE.Group();
  back.name = "back";
  back.position.set(0, 0.08, heroFemaleWarrior ? -0.36 : -0.43);
  torso.add(back);

  const neck = capsule("neck", options.body === "masculine" ? 0.17 : heroFemaleWarrior ? 0.14 : 0.155, 0.12, skin);
  neck.position.y = heroFemaleWarrior ? 3.86 : 3.91;
  neck.scale.z = 0.9;
  root.add(neck);

  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, heroFemaleWarrior ? 4.25 : 4.38, 0);
  head.scale.setScalar(0.9);
  addFace(head, options);
  addHair(head, options);
  root.add(head);

  for (const [side, sign] of [["L", 1], ["R", -1]] as const) {
    const armMaterial = heroFemaleWarrior ? skin : sleeve;
    const arm = createLimb(`arm.${side}`, 0.76, 0.68, options.body === "masculine" ? 0.16 : 0.145, armMaterial, `hand.${side}`, armMaterial, gloveMaterial);
    arm.position.set(sign * shoulderX, heroFemaleWarrior ? 3.57 : 3.58, 0);
    arm.rotation.z = sign * 0.065;
    if (heroFemaleWarrior) {
      arm.add(mesh(`outfit.warrior.short-sleeve.${side}`, new THREE.CylinderGeometry(0.17, 0.14, 0.32, 18), new THREE.MeshStandardMaterial({ color: palette.primary, roughness: 0.74 }), [0, -0.16, 0], [1, 1, 0.9]));
      const cuff = mesh(`outfit.warrior.sleeve-cuff.${side}`, new THREE.TorusGeometry(0.14, 0.025, 7, 18), new THREE.MeshStandardMaterial({ color: palette.secondary, roughness: 0.8 }), [0, -0.33, 0], [1, 1, 0.9]);
      cuff.rotation.x = Math.PI / 2;
      arm.add(cuff);
      const lowerArm = arm.getObjectByName(`arm.${side}.lower`);
      lowerArm?.add(mesh(`outfit.warrior.glove-bracer.${side}`, new THREE.CylinderGeometry(0.135, 0.12, 0.3, 16), gloveMaterial, [0, -0.51, 0], [1, 1, 0.88]));
      lowerArm?.add(mesh(`outfit.warrior.glove-band.${side}`, new THREE.TorusGeometry(0.125, 0.018, 6, 16), standard(COMMON_COLORS.leatherLight, 0.76), [0, -0.36, 0], [1, 1, 0.88]).rotateX(Math.PI / 2));
    } else if (options.classId === "warrior") {
      const cuff = mesh(`outfit.warrior.sleeve-cuff.${side}`, new THREE.TorusGeometry(0.145, 0.025, 6, 16), toon(palette.secondary), [0, -0.56, 0], [1, 1, 0.9]);
      cuff.rotation.x = Math.PI / 2;
      arm.add(cuff);
    } else if (options.classId === "mage") {
      const lowerArm = arm.getObjectByName(`arm.${side}.lower`);
      lowerArm?.add(mesh(`outfit.mage.sleeve.${side}`, new THREE.CylinderGeometry(0.21, 0.145, 0.34, 14), toon(palette.primary), [0, -0.46, 0], [1, 1, 0.88]));
    }
    root.add(arm);

    const thighMaterial = options.body === "feminine" && options.classId === "warrior" ? skin : undersuit;
    const leg = createLimb(`leg.${side}`, heroFemaleWarrior ? 0.96 : 0.93, heroFemaleWarrior ? 0.9 : 0.87, options.body === "masculine" ? 0.19 : heroFemaleWarrior ? 0.19 : 0.18, thighMaterial, `ankle.${side}`, bootMaterial, bootMaterial);
    leg.position.set(sign * hipX, heroFemaleWarrior ? 2.25 : 2.22, 0);
    if (options.body === "feminine" && options.classId === "warrior") {
      leg.add(mesh(`outfit.warrior.shorts.${side}`, new THREE.CylinderGeometry(0.2, 0.185, 0.36, 14), undersuit, [0, -0.2, 0], [1, 1, 0.9]));
    }
    root.add(leg);
    const ankle = leg.getObjectByName(`ankle.${side}`);
    if (ankle) {
      ankle.add(mesh(`boot.${side}`, new THREE.SphereGeometry(heroFemaleWarrior ? 0.21 : 0.24, 18, 12), bootMaterial, [0, heroFemaleWarrior ? -0.18 : -0.13, 0.13], heroFemaleWarrior ? [0.76, 0.72, 1.36] : [0.82, 1.08, 1.42]));
      ankle.add(mesh(`boot.${side}.sole`, new THREE.BoxGeometry(heroFemaleWarrior ? 0.27 : 0.31, 0.07, heroFemaleWarrior ? 0.44 : 0.5), standard(0x2d2521, 0.9), [0, heroFemaleWarrior ? -0.34 : -0.34, 0.17]));
      if (heroFemaleWarrior) {
        ankle.add(mesh(`boot.${side}.cuff`, new THREE.CylinderGeometry(0.2, 0.17, 0.27, 16), standard(COMMON_COLORS.leatherLight, 0.76), [0, 0.04, 0], [1, 1, 0.88]));
        const buckle = mesh(`boot.${side}.buckle`, new THREE.TorusGeometry(0.055, 0.012, 6, 14), metal(0xb08a46), [sign * 0.13, -0.02, 0.15]);
        buckle.rotation.y = Math.PI / 2;
        ankle.add(buckle);
      } else {
        const cuff = mesh(`boot.${side}.cuff`, new THREE.TorusGeometry(0.18, 0.035, 6, 16), standard(COMMON_COLORS.leatherLight, 0.76), [0, 0.06, 0], [1, 1, 0.86]);
        cuff.rotation.x = Math.PI / 2;
        ankle.add(cuff);
      }
    }
  }

  const outfitRootMount = new THREE.Group();
  outfitRootMount.name = "outfit.mount.root";
  root.add(outfitRootMount);
  const outfitChestMount = new THREE.Group();
  outfitChestMount.name = "outfit.mount.chest";
  torso.add(outfitChestMount);

  const outfitId = options.outfitId ?? getDefaultAvatarOutfitId(options.classId);
  const outfit = createAvatarOutfitVisual(outfitId, options.body);
  outfitRootMount.add(outfit.root);
  outfitChestMount.add(outfit.chest);

  const nodes = collectNamedNodes(root);
  const sockets = {
    "hand.R": nodes["hand.R"],
    "hand.L": nodes["hand.L"],
    head: nodes.head,
    back: nodes.back,
  };
  if (Object.values(sockets).some((socket) => socket === undefined)) throw new Error("Avatar socket contract is incomplete");

  root.userData.sculptRuntime = {
    nodes,
    sockets,
    colliders: [nodes["pelvis.mesh"], nodes["chest.mesh"]].filter((node): node is THREE.Object3D => node !== undefined),
    destructionGroups: {
      body: ["pelvis", "chest", "head"],
      limbs: ["arm.L.upper", "arm.R.upper", "leg.L.upper", "leg.R.upper"],
      equipment: ["hand.R", "back"],
      hair: ["hair"],
      outfit: ["outfit.mount.root", "outfit.mount.chest"],
    },
  } satisfies SculptRuntime;
  root.userData.avatarOptions = options;
  root.userData.img2threejs = {
    pipeline: "procedural-character",
    pass: "concept-silhouette",
    reference: `docs_working/reference/concepts/${options.body}-${options.classId}-turnaround-v1.png`,
    headUnits: 5,
  };
  return root;
}
