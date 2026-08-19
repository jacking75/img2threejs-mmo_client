import * as THREE from "three";
import type {
  AccessoryArchetype,
  HeadArchetype,
  OutfitArchetype,
  PlayerItemDefinition,
  PlayerItemTheme,
  WeaponArchetype,
} from "./types";

interface Palette {
  readonly primary: number;
  readonly secondary: number;
  readonly accent: number;
  readonly dark: number;
  readonly metal: number;
  readonly glow: number;
}

const PALETTES: Readonly<Record<PlayerItemTheme, Palette>> = {
  frontier: { primary: 0x496449, secondary: 0x8a6542, accent: 0xd5bd78, dark: 0x29352c, metal: 0x99a6a2, glow: 0x9fd6b2 },
  royal: { primary: 0x315c91, secondary: 0xe8e1ce, accent: 0xd4aa46, dark: 0x202f50, metal: 0xc9d2da, glow: 0x82b9ff },
  moon: { primary: 0x554783, secondary: 0xbec7dc, accent: 0x8dd1d8, dark: 0x29243f, metal: 0xa9bad0, glow: 0x8ef4ef },
  infernal: { primary: 0x8b302a, secondary: 0x4c3934, accent: 0xe58a38, dark: 0x271e20, metal: 0x716367, glow: 0xff693b },
};

function material(color: number, metalness = 0, roughness = 0.66): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function part(
  name: string,
  geometry: THREE.BufferGeometry,
  sourceMaterial: THREE.Material,
  position: readonly [number, number, number] = [0, 0, 0],
  scale: readonly [number, number, number] = [1, 1, 1],
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, sourceMaterial);
  result.name = name;
  result.position.set(...position);
  result.scale.set(...scale);
  result.castShadow = true;
  result.receiveShadow = true;
  result.userData.original = true;
  result.userData.procedural = true;
  return result;
}

function shapePart(
  name: string,
  points: readonly (readonly [number, number])[],
  depth: number,
  sourceMaterial: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(depth * 0.2, 0.025),
    bevelThickness: Math.min(depth * 0.2, 0.025),
  });
  geometry.translate(0, 0, -depth / 2);
  return part(name, geometry, sourceMaterial);
}

function addBand(parent: THREE.Group, name: string, y: number, radius: number, sourceMaterial: THREE.Material): void {
  const band = part(name, new THREE.TorusGeometry(radius, 0.018, 5, 12), sourceMaterial, [0, y, 0]);
  band.rotation.x = Math.PI / 2;
  parent.add(band);
}

function createRoot(definition: PlayerItemDefinition): THREE.Group {
  const root = new THREE.Group();
  root.name = definition.id;
  root.userData.resource = {
    id: definition.id,
    label: definition.label,
    category: definition.category,
    subtype: definition.subtype,
    theme: definition.theme,
    tags: [...definition.tags],
    original: true,
    procedural: true,
    source: "project-original-procedural",
    quality: {
      tier: "runtime-preview",
      silhouette: "archetype-specific",
      materials: "theme-layered",
    },
    dispose: "deep-geometry-and-materials",
  };
  return root;
}

function addGrip(root: THREE.Group, palette: Palette, length = 0.46, radius = 0.07): void {
  const grip = part("grip", new THREE.CylinderGeometry(radius, radius * 1.06, length, 8), material(palette.secondary, 0, 0.78));
  root.add(grip);
  for (let index = 0; index < 4; index += 1) {
    addBand(root, `grip.wrap.${index + 1}`, -length * 0.34 + index * length * 0.22, radius * 1.05, material(palette.accent, 0.15, 0.58));
  }
}

function addGuardAndPommel(root: THREE.Group, palette: Palette, width = 0.48): void {
  const guard = part("guard", new THREE.CapsuleGeometry(0.055, width, 4, 8), material(palette.accent, 0.72, 0.3), [0, 0.28, 0]);
  guard.rotation.z = Math.PI / 2;
  root.add(guard);
  root.add(part("pommel", new THREE.OctahedronGeometry(0.105, 0), material(palette.metal, 0.8, 0.26), [0, -0.31, 0]));
}

function addStraightBlade(root: THREE.Group, palette: Palette, length: number, width: number, tipStyle: "point" | "cleaver" | "needle" = "point"): void {
  const points: readonly (readonly [number, number])[] = tipStyle === "cleaver"
    ? [[-width * 0.55, 0.26], [-width * 0.7, length * 0.84], [-width * 0.38, length], [width * 0.62, length * 0.94], [width * 0.48, 0.26]]
    : tipStyle === "needle"
      ? [[-width * 0.25, 0.25], [-width * 0.12, length * 0.88], [0, length], [width * 0.12, length * 0.88], [width * 0.25, 0.25]]
      : [[-width / 2, 0.25], [-width * 0.42, length * 0.86], [0, length], [width * 0.42, length * 0.86], [width / 2, 0.25]];
  root.add(shapePart("blade", points, Math.max(0.045, width * 0.28), material(palette.metal, 0.84, 0.23)));
  root.add(part("blade.fuller", new THREE.BoxGeometry(Math.max(0.018, width * 0.12), length * 0.58, 0.018), material(palette.dark, 0.65, 0.34), [0, length * 0.56, width * 0.16]));
}

function addAxeHead(root: THREE.Group, palette: Palette, y: number, large: boolean, halberd = false): void {
  const width = large ? 0.62 : 0.45;
  root.add(shapePart("head.blade", [[0, y - 0.2], [-width, y - 0.32], [-width * 0.88, y + 0.22], [0, y + 0.34]], 0.12, material(palette.metal, 0.82, 0.27)));
  if (large || halberd) {
    const rear = shapePart("head.rear-blade", [[0, y - 0.16], [width * 0.62, y - 0.25], [width * 0.52, y + 0.18], [0, y + 0.28]], 0.1, material(palette.primary, 0.62, 0.34));
    root.add(rear);
  }
  if (halberd) root.add(part("head.spike", new THREE.ConeGeometry(0.09, 0.58, 6), material(palette.accent, 0.76, 0.25), [0, y + 0.54, 0]));
}

function createWeapon(definition: PlayerItemDefinition, archetype: WeaponArchetype): THREE.Group {
  const root = createRoot(definition);
  const palette = PALETTES[definition.theme];
  root.userData.equipmentContract = {
    gripOrigin: [0, 0, 0],
    bladeAxis: "+Y",
    frontAxis: "+Z",
    socket: "hand.R",
    dispose: "deep-geometry-and-materials",
  };
  root.userData.attachment = { socket: "hand.R", anchorNode: "grip", position: [0, 0, 0], forwardAxis: "+Z", upAxis: "+Y" };

  if (["longsword", "greatsword", "rapier", "dagger", "twinblade"].includes(archetype)) {
    const dimensions: Record<string, readonly [number, number, "point" | "cleaver" | "needle"]> = {
      longsword: [2.05, 0.23, "point"], greatsword: [2.72, 0.43, "cleaver"], rapier: [2.25, 0.11, "needle"], dagger: [1.05, 0.26, "point"], twinblade: [1.65, 0.18, "point"],
    };
    const [length, width, tip] = dimensions[archetype];
    addGrip(root, palette, archetype === "greatsword" ? 0.68 : 0.46, archetype === "greatsword" ? 0.09 : 0.07);
    addGuardAndPommel(root, palette, archetype === "rapier" ? 0.62 : archetype === "greatsword" ? 0.72 : 0.46);
    addStraightBlade(root, palette, length, width, tip);
    if (archetype === "rapier") addBand(root, "guard.basket", 0.12, 0.24, material(palette.accent, 0.74, 0.3));
    if (archetype === "twinblade") {
      const lower = shapePart("blade.lower", [[-0.09, -0.24], [-0.07, -1.18], [0, -1.42], [0.07, -1.18], [0.09, -0.24]], 0.055, material(palette.metal, 0.84, 0.23));
      root.add(lower);
    }
  } else if (["battleaxe", "greataxe", "halberd"].includes(archetype)) {
    const large = archetype === "greataxe";
    const length = archetype === "halberd" ? 2.7 : large ? 2.15 : 1.65;
    addGrip(root, palette, 0.56, 0.075);
    root.add(part("shaft", new THREE.CylinderGeometry(0.055, 0.07, length, 8), material(palette.secondary, 0, 0.78), [0, length * 0.42, 0]));
    addAxeHead(root, palette, length * 0.91, large, archetype === "halberd");
    root.add(part("pommel", new THREE.ConeGeometry(0.085, 0.25, 6), material(palette.accent, 0.76, 0.28), [0, -0.38, 0]));
  } else if (["warhammer", "maul"].includes(archetype)) {
    const maul = archetype === "maul";
    const length = maul ? 2.15 : 1.55;
    addGrip(root, palette, 0.58, 0.075);
    root.add(part("shaft", new THREE.CylinderGeometry(0.06, 0.075, length, 8), material(palette.secondary, 0, 0.78), [0, length * 0.42, 0]));
    const hammerHead = part("head.hammer", new THREE.BoxGeometry(maul ? 0.92 : 0.64, maul ? 0.48 : 0.34, maul ? 0.46 : 0.34), material(palette.metal, 0.82, 0.3), [0, length * 0.9, 0]);
    hammerHead.geometry.rotateZ(maul ? 0.08 : -0.04);
    root.add(hammerHead);
    root.add(part("head.spike", new THREE.ConeGeometry(0.12, maul ? 0.42 : 0.32, 6), material(palette.accent, 0.76, 0.27), [maul ? 0.66 : 0.47, length * 0.9, 0], [1, 1, 1]));
    root.getObjectByName("head.spike")?.rotateZ(-Math.PI / 2);
  } else if (["spear", "glaive", "scythe"].includes(archetype)) {
    const length = archetype === "spear" ? 2.75 : 2.6;
    addGrip(root, palette, 0.64, 0.058);
    root.add(part("shaft", new THREE.CylinderGeometry(0.043, 0.06, length, 8), material(palette.secondary, 0, 0.8), [0, length * 0.42, 0]));
    if (archetype === "spear") {
      root.add(shapePart("blade", [[-0.16, length * 0.86], [0, length + 0.32], [0.16, length * 0.86], [0, length * 0.7]], 0.07, material(palette.metal, 0.84, 0.23)));
    } else if (archetype === "glaive") {
      root.add(shapePart("blade", [[-0.1, length * 0.72], [-0.34, length * 0.92], [-0.22, length + 0.42], [0.08, length + 0.14], [0.14, length * 0.76]], 0.09, material(palette.metal, 0.84, 0.23)));
    } else {
      root.add(shapePart("blade", [[0, length * 0.82], [-0.62, length + 0.2], [-1.12, length + 0.08], [-0.5, length + 0.42], [0.18, length + 0.34]], 0.08, material(palette.metal, 0.84, 0.23)));
    }
    root.add(part("pommel", new THREE.ConeGeometry(0.08, 0.28, 6), material(palette.accent, 0.72, 0.3), [0, -0.45, 0]));
  } else if (archetype === "longbow") {
    addGrip(root, palette, 0.5, 0.075);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -1.45, 0), new THREE.Vector3(-0.34, -0.72, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.34, 0.72, 0), new THREE.Vector3(0, 1.45, 0),
    ]);
    root.add(part("limb.bow", new THREE.TubeGeometry(curve, 24, 0.045, 6, false), material(palette.primary, 0, 0.55)));
    root.add(part("string", new THREE.CylinderGeometry(0.009, 0.009, 2.9, 5), material(palette.accent, 0.1, 0.45)));
    root.add(part("guard.arrow-rest", new THREE.BoxGeometry(0.25, 0.05, 0.08), material(palette.metal, 0.7, 0.3), [0, 0.12, 0]));
  } else if (["staff", "wand"].includes(archetype)) {
    const length = archetype === "staff" ? 2.55 : 1.05;
    addGrip(root, palette, archetype === "staff" ? 0.64 : 0.4, archetype === "staff" ? 0.06 : 0.05);
    root.add(part("shaft", new THREE.CylinderGeometry(0.035, 0.065, length, 8), material(palette.secondary, 0, 0.73), [0, length * 0.42, 0]));
    root.add(part("head.crystal", archetype === "staff" ? new THREE.OctahedronGeometry(0.24, 0) : new THREE.TetrahedronGeometry(0.18, 0), material(palette.glow, 0.15, 0.2), [0, length * 0.92, 0]));
    addBand(root, "head.focus-ring", length * 0.91, archetype === "staff" ? 0.36 : 0.26, material(palette.accent, 0.7, 0.28));
    root.add(part("pommel", new THREE.SphereGeometry(0.09, 8, 6), material(palette.metal, 0.7, 0.3), [0, -0.33, 0]));
  } else if (archetype === "gauntlet") {
    addGrip(root, palette, 0.38, 0.1);
    root.add(part("head.knuckle", new THREE.BoxGeometry(0.48, 0.3, 0.42), material(palette.metal, 0.8, 0.3), [0, 0.34, 0.12], [1, 1, 1]));
    for (let index = 0; index < 4; index += 1) root.add(part(`head.claw.${index + 1}`, new THREE.ConeGeometry(0.055, 0.38, 5), material(palette.accent, 0.76, 0.26), [-0.18 + index * 0.12, 0.63, 0.17]));
    root.add(part("guard.cuff", new THREE.CylinderGeometry(0.22, 0.17, 0.3, 8), material(palette.primary, 0.45, 0.42), [0, -0.16, 0]));
  } else {
    addGrip(root, palette, 0.4, 0.065);
    const ring = part("blade.chakram", new THREE.TorusGeometry(0.72, 0.1, 6, 24), material(palette.metal, 0.84, 0.22), [0, 0.58, 0]);
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
    for (let index = 0; index < 6; index += 1) {
      const spike = part(`blade.spike.${index + 1}`, new THREE.ConeGeometry(0.08, 0.28, 5), material(palette.accent, 0.72, 0.26), [Math.sin(index * Math.PI / 3) * 0.82, 0.58 + Math.cos(index * Math.PI / 3) * 0.82, 0]);
      spike.rotation.z = -index * Math.PI / 3;
      root.add(spike);
    }
    root.add(part("guard.bridge", new THREE.BoxGeometry(0.44, 0.09, 0.09), material(palette.dark, 0.28, 0.58), [0, 0.25, 0]));
  }
  return root;
}

function addTorsoShell(chest: THREE.Group, palette: Palette, width: number, height: number, depth: number, metalShell: boolean): void {
  chest.add(part("chest.core", new THREE.CapsuleGeometry(width * 0.48, Math.max(0.15, height - width), 6, 10), material(metalShell ? palette.metal : palette.primary, metalShell ? 0.7 : 0, metalShell ? 0.3 : 0.7), [0, 0, 0], [1, 1, depth / width]));
  chest.add(part("chest.belt", new THREE.CylinderGeometry(width * 0.55, width * 0.52, 0.16, 10), material(palette.secondary, 0, 0.75), [0, -height * 0.38, 0], [1, 1, depth / width]));
}

function createOutfit(definition: PlayerItemDefinition, archetype: OutfitArchetype): THREE.Group {
  const root = createRoot(definition);
  const palette = PALETTES[definition.theme];
  root.userData.attachment = { socket: "chest", anchorNode: "chest", position: [0, 0, 0], forwardAxis: "+Z", upAxis: "+Y" };
  const chest = new THREE.Group();
  chest.name = "chest";
  chest.position.y = 1.45;
  const metalShell = ["plate", "chainmail", "smith", "dragon"].includes(archetype);
  const wide = ["plate", "noble", "dragon"].includes(archetype);
  addTorsoShell(chest, palette, wide ? 0.9 : 0.76, 1.16, wide ? 0.58 : 0.5, metalShell);
  root.add(chest);

  const shoulderShape = archetype === "dragon" ? new THREE.ConeGeometry(0.3, 0.62, 6) : archetype === "plate" ? new THREE.SphereGeometry(0.33, 10, 7) : new THREE.BoxGeometry(0.5, 0.18, 0.46);
  for (const side of [-1, 1] as const) {
    const shoulder = part(`chest.shoulder.${side < 0 ? "L" : "R"}`, shoulderShape.clone(), material(metalShell ? palette.metal : palette.secondary, metalShell ? 0.68 : 0, 0.42), [side * (wide ? 0.65 : 0.56), 0.35, 0]);
    if (archetype === "dragon") shoulder.rotation.z = side * -0.52;
    if (archetype === "plate") {
      shoulder.scale.set(1.25, 0.68, 1.08);
      shoulder.rotation.z = side * -0.14;
    }
    chest.add(shoulder);
  }

  if (["mage", "priest", "noble", "sailor"].includes(archetype)) {
    const collar = part("chest.collar", archetype === "priest" ? new THREE.TorusGeometry(0.36, 0.09, 6, 18) : new THREE.ConeGeometry(0.48, 0.44, 10, 1, true), material(palette.accent, 0.12, 0.54), [0, 0.55, 0]);
    if (archetype === "priest") collar.rotation.x = Math.PI / 2;
    chest.add(collar);
  }

  const skirt = new THREE.Group();
  skirt.name = "skirt";
  skirt.position.y = 0.63;
  const skirtHeight = ["mage", "priest", "noble"].includes(archetype) ? 1.22 : 0.72;
  skirt.add(part("skirt.panel", new THREE.ConeGeometry(archetype === "assassin" ? 0.62 : 0.78, skirtHeight, archetype === "dragon" ? 8 : 12, 1, true), material(palette.primary, metalShell ? 0.38 : 0, 0.7)));
  if (archetype === "chainmail") {
    for (let index = 0; index < 4; index += 1) addBand(skirt, `skirt.mail-ring.${index + 1}`, -0.24 + index * 0.16, 0.59 - index * 0.02, material(palette.metal, 0.68, 0.4));
  }
  root.add(skirt);

  const definingParts: Partial<Record<OutfitArchetype, () => void>> = {
    adventurer: () => {
      chest.add(part("chest.satchel", new THREE.BoxGeometry(0.38, 0.42, 0.18), material(palette.secondary, 0, 0.78), [0.44, -0.12, 0.36]));
      chest.add(part("chest.satchel-buckle", new THREE.TorusGeometry(0.075, 0.018, 5, 8), material(palette.accent, 0.55, 0.38), [0.44, -0.1, 0.47]));
    },
    plate: () => {
      chest.add(part("chest.breastplate", new THREE.CylinderGeometry(0.54, 0.44, 0.9, 12), material(palette.metal, 0.78, 0.25), [0, 0.02, 0.13], [1, 1, 0.72]));
      chest.add(part("chest.breastplate-keel", new THREE.BoxGeometry(0.08, 0.72, 0.08), material(palette.accent, 0.66, 0.3), [0, 0.04, 0.53]));
    },
    chainmail: () => chest.add(part("chest.mail-yoke", new THREE.TorusGeometry(0.44, 0.12, 6, 18), material(palette.metal, 0.66, 0.46), [0, 0.42, 0], [1.25, 1, 0.8])),
    leather: () => chest.add(part("chest.cross-straps", new THREE.BoxGeometry(0.14, 1.15, 0.08), material(palette.secondary, 0, 0.8), [0, 0.05, 0.5], [1, 1, 1])),
    ranger: () => chest.add(part("chest.leaf-mantle", new THREE.ConeGeometry(0.78, 0.42, 7, 1, true), material(palette.secondary, 0, 0.76), [0, 0.43, 0])),
    mage: () => chest.add(part("chest.focus-gem", new THREE.OctahedronGeometry(0.16, 0), material(palette.glow, 0.15, 0.22), [0, 0.12, 0.5])),
    priest: () => chest.add(part("chest.sun-emblem", new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), material(palette.accent, 0.66, 0.3), [0, 0.12, 0.5], [1, 1, 1])),
    assassin: () => chest.add(part("chest.knife-harness", new THREE.BoxGeometry(0.54, 0.1, 0.1), material(palette.dark, 0.2, 0.55), [0.2, 0.1, 0.5])),
    noble: () => chest.add(part("chest.royal-sash", new THREE.BoxGeometry(0.22, 1.34, 0.08), material(palette.accent, 0.2, 0.52), [0.14, 0.02, 0.51])),
    sailor: () => chest.add(part("chest.sailor-collar", new THREE.BoxGeometry(1.02, 0.34, 0.12), material(palette.secondary, 0, 0.72), [0, 0.35, -0.28])),
    smith: () => chest.add(part("chest.apron", new THREE.BoxGeometry(0.66, 1.1, 0.1), material(palette.secondary, 0, 0.84), [0, -0.05, 0.48])),
    dragon: () => chest.add(part("chest.scale-keel", new THREE.ConeGeometry(0.13, 0.92, 5), material(palette.accent, 0.66, 0.32), [0, 0, 0.52])),
  };
  definingParts[archetype]?.();
  return root;
}

function createHead(definition: PlayerItemDefinition, archetype: HeadArchetype): THREE.Group {
  const root = createRoot(definition);
  const palette = PALETTES[definition.theme];
  root.userData.attachment = { socket: "head", anchorNode: "head", position: [0, 0, 0], forwardAxis: "+Z", upAxis: "+Y" };
  const head = new THREE.Group();
  head.name = "head";
  root.add(head);
  if (archetype === "sallet") {
    head.add(part("head.shell", new THREE.SphereGeometry(0.52, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.62), material(palette.metal, 0.76, 0.28), [0, 0.2, 0], [1, 0.86, 1.08]));
    head.add(part("head.visor", new THREE.BoxGeometry(0.82, 0.18, 0.2), material(palette.dark, 0.65, 0.32), [0, 0.12, 0.46]));
  } else if (archetype === "greathelm") {
    head.add(part("head.shell", new THREE.CylinderGeometry(0.48, 0.5, 0.92, 10), material(palette.metal, 0.78, 0.26), [0, 0.05, 0]));
    head.add(part("head.faceplate", new THREE.BoxGeometry(0.78, 0.58, 0.12), material(palette.primary, 0.55, 0.38), [0, -0.02, 0.46]));
    head.add(part("head.crest", new THREE.BoxGeometry(0.14, 0.5, 0.7), material(palette.accent, 0.25, 0.5), [0, 0.72, -0.08]));
  } else if (archetype === "hood") {
    head.add(part("head.hood", new THREE.ConeGeometry(0.64, 1.04, 12, 1, true), material(palette.primary, 0, 0.82), [0, 0.15, -0.04]));
    addBand(head, "head.hood-trim", -0.28, 0.53, material(palette.accent, 0.1, 0.6));
  } else if (archetype === "circlet") {
    addBand(head, "head.circlet", 0.13, 0.49, material(palette.accent, 0.78, 0.25));
    head.add(part("head.gem", new THREE.OctahedronGeometry(0.13, 0), material(palette.glow, 0.2, 0.18), [0, 0.18, 0.49]));
    for (const side of [-1, 1] as const) head.add(part(`head.wing.${side < 0 ? "L" : "R"}`, new THREE.ConeGeometry(0.09, 0.42, 5), material(palette.metal, 0.65, 0.3), [side * 0.48, 0.3, 0]));
  } else if (archetype === "witchhat") {
    head.add(part("head.crown", new THREE.ConeGeometry(0.48, 1.22, 10), material(palette.primary, 0, 0.78), [0.12, 0.72, 0]));
    head.getObjectByName("head.crown")?.rotateZ(-0.18);
    head.add(part("head.brim", new THREE.CylinderGeometry(0.86, 0.86, 0.09, 14), material(palette.dark, 0, 0.76), [0, 0.1, 0], [1.15, 1, 0.85]));
    addBand(head, "head.hat-band", 0.3, 0.43, material(palette.accent, 0.3, 0.48));
  } else {
    head.add(part("head.shell", new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.64), material(palette.metal, 0.76, 0.27), [0, 0.2, 0]));
    for (const side of [-1, 1] as const) {
      const horn = part(`head.horn.${side < 0 ? "L" : "R"}`, new THREE.ConeGeometry(0.14, 0.82, 7), material(palette.accent, 0.45, 0.44), [side * 0.45, 0.66, 0]);
      horn.rotation.z = side * -0.48;
      head.add(horn);
    }
  }
  return root;
}

function createAccessory(definition: PlayerItemDefinition, archetype: AccessoryArchetype): THREE.Group {
  const root = createRoot(definition);
  const palette = PALETTES[definition.theme];
  const socket = archetype === "cape" || archetype === "quiver" ? "back" : archetype === "spellbook" || archetype === "lantern" ? "hand.L" : "hand.L";
  const anchorNode = archetype === "cape" || archetype === "quiver" ? "back" : "grip";
  root.userData.attachment = { socket, anchorNode, position: [0, 0, 0], forwardAxis: "+Z", upAxis: "+Y" };
  const anchor = new THREE.Group();
  anchor.name = anchorNode;
  root.add(anchor);
  if (archetype === "roundshield") {
    const shield = part("shield.body", new THREE.CylinderGeometry(0.72, 0.72, 0.14, 18), material(palette.primary, 0.35, 0.45), [0, 0.45, 0]);
    shield.rotation.x = Math.PI / 2;
    anchor.add(shield);
    anchor.add(part("shield.boss", new THREE.SphereGeometry(0.25, 10, 7), material(palette.metal, 0.78, 0.26), [0, 0.45, 0.12], [1, 1, 0.5]));
    for (let index = 0; index < 8; index += 1) anchor.add(part(`shield.rivet.${index + 1}`, new THREE.SphereGeometry(0.045, 6, 4), material(palette.accent, 0.72, 0.3), [Math.sin(index * Math.PI / 4) * 0.56, 0.45 + Math.cos(index * Math.PI / 4) * 0.56, 0.15]));
  } else if (archetype === "towershield") {
    anchor.add(shapePart("shield.body", [[-0.58, -0.12], [-0.64, 1.26], [0, 1.62], [0.64, 1.26], [0.58, -0.12], [0, -0.34]], 0.16, material(palette.primary, 0.35, 0.44)));
    anchor.add(part("shield.keel", new THREE.BoxGeometry(0.12, 1.7, 0.11), material(palette.metal, 0.75, 0.28), [0, 0.65, 0.13]));
    anchor.add(part("shield.emblem", new THREE.OctahedronGeometry(0.22, 0), material(palette.accent, 0.7, 0.28), [0, 0.72, 0.23], [1, 1.3, 0.35]));
  } else if (archetype === "cape") {
    anchor.add(shapePart("back.cape", [[-0.62, 0.2], [-0.78, -1.68], [0, -1.92], [0.78, -1.68], [0.62, 0.2]], 0.07, material(palette.primary, 0, 0.82)));
    anchor.add(part("back.clasp", new THREE.TorusGeometry(0.22, 0.055, 6, 14), material(palette.accent, 0.74, 0.26), [0, 0.18, 0.06]));
    for (let index = 0; index < 3; index += 1) anchor.add(part(`back.fold.${index + 1}`, new THREE.BoxGeometry(0.05, 1.55, 0.05), material(palette.secondary, 0, 0.74), [-0.25 + index * 0.25, -0.75, 0.08]));
  } else if (archetype === "quiver") {
    anchor.add(part("back.quiver", new THREE.CylinderGeometry(0.22, 0.28, 1.35, 10, 1, true), material(palette.secondary, 0, 0.82), [0, -0.35, 0]));
    for (let index = 0; index < 5; index += 1) {
      anchor.add(part(`back.arrow.${index + 1}`, new THREE.CylinderGeometry(0.018, 0.018, 1.62, 5), material(palette.dark, 0, 0.76), [-0.12 + index * 0.06, 0.25 + (index % 2) * 0.08, 0]));
      anchor.add(part(`back.arrowhead.${index + 1}`, new THREE.ConeGeometry(0.055, 0.18, 5), material(palette.metal, 0.75, 0.28), [-0.12 + index * 0.06, 1.13 + (index % 2) * 0.08, 0]));
    }
  } else if (archetype === "spellbook") {
    anchor.add(part("offhand.book", new THREE.BoxGeometry(0.72, 0.92, 0.2), material(palette.primary, 0, 0.76), [0, 0.38, 0]));
    anchor.add(part("offhand.pages", new THREE.BoxGeometry(0.62, 0.82, 0.17), material(0xe8dfc5, 0, 0.9), [0, 0.38, 0.03]));
    anchor.add(part("offhand.rune", new THREE.TorusGeometry(0.2, 0.035, 6, 12), material(palette.glow, 0.2, 0.2), [0, 0.38, 0.13]));
    anchor.add(part("offhand.spine", new THREE.BoxGeometry(0.1, 0.94, 0.23), material(palette.accent, 0.52, 0.36), [-0.34, 0.38, 0]));
  } else {
    anchor.add(part("offhand.handle", new THREE.TorusGeometry(0.28, 0.045, 6, 14, Math.PI), material(palette.metal, 0.72, 0.3), [0, 0.14, 0]));
    anchor.add(part("offhand.lantern-frame", new THREE.CylinderGeometry(0.32, 0.38, 0.75, 8, 1, true), material(palette.dark, 0.56, 0.38), [0, -0.38, 0]));
    anchor.add(part("offhand.lantern-light", new THREE.SphereGeometry(0.23, 9, 7), material(palette.glow, 0.1, 0.2), [0, -0.38, 0]));
    anchor.add(part("offhand.lantern-base", new THREE.CylinderGeometry(0.38, 0.34, 0.12, 8), material(palette.accent, 0.72, 0.3), [0, -0.8, 0]));
  }
  return root;
}

export function createPlayerItemResource(definition: PlayerItemDefinition): THREE.Group {
  const root = definition.category === "weapon"
    ? createWeapon(definition, definition.subtype as WeaponArchetype)
    : definition.category === "outfit"
      ? createOutfit(definition, definition.subtype as OutfitArchetype)
      : definition.category === "head"
        ? createHead(definition, definition.subtype as HeadArchetype)
        : createAccessory(definition, definition.subtype as AccessoryArchetype);
  const quality = root.userData.resource.quality as Readonly<Record<string, unknown>>;
  const attachment = root.userData.attachment as Readonly<Record<string, unknown>>;
  root.traverse((node) => {
    node.userData.original = true;
    node.userData.procedural = true;
    node.userData.quality = quality;
    node.userData.attachment = attachment;
  });
  return root;
}

export function disposePlayerItemResource(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((entry) => entry.dispose());
  });
  root.userData.disposed = true;
}
