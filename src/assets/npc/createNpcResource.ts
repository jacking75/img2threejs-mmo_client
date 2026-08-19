import * as THREE from "three";
import { createAnimeAvatar } from "../avatar/createAnimeAvatar";
import { collectNamedNodes, mesh } from "../geometry";
import type { NpcArchetype, NpcBuildContext, NpcFaction, NpcResourceGroup } from "./types";

type Palette = Readonly<{
  primary: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
}>;

function material(color: number, roughness = 0.7, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createPalette(faction: NpcFaction): Palette {
  return {
    primary: material(faction.primary, 0.76),
    secondary: material(faction.secondary, 0.78),
    accent: material(faction.accent, 0.42, 0.18),
    dark: material(0x27313a, 0.82),
    leather: material(0x65452e, 0.85),
    wood: material(0x704727, 0.9),
    steel: material(0xaab8be, 0.3, 0.72),
    glass: material(0x7bd4d1, 0.2, 0.12),
  };
}

function namedGroup(name: string): THREE.Group {
  const result = new THREE.Group();
  result.name = name;
  return result;
}

function addBox(
  root: THREE.Object3D,
  name: string,
  size: readonly [number, number, number],
  sourceMaterial: THREE.Material,
  position: readonly [number, number, number] = [0, 0, 0],
  rotation: readonly [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const result = mesh(name, new THREE.BoxGeometry(...size), sourceMaterial, position);
  result.rotation.set(...rotation);
  root.add(result);
  return result;
}

function addRod(
  root: THREE.Object3D,
  name: string,
  length: number,
  radius: number,
  sourceMaterial: THREE.Material,
  position: readonly [number, number, number] = [0, -length * 0.38, 0],
): THREE.Mesh {
  const result = mesh(name, new THREE.CylinderGeometry(radius, radius, length, 10), sourceMaterial, position);
  root.add(result);
  return result;
}

function addFactionDress(context: NpcBuildContext, palette: Palette): void {
  const mantle = namedGroup(`npc.faction.${context.faction.id}.mantle`);
  mantle.add(mesh("npc.faction.mantle.collar", new THREE.TorusGeometry(0.4, 0.075, 7, 24), palette.primary, [0, 0.36, 0], [1, 1, 0.72]).rotateX(Math.PI / 2));
  addBox(mantle, "npc.faction.mantle.sash", [0.1, 1.15, 0.045], palette.secondary, [0.02, -0.04, 0.43], [0, 0, -0.42]);
  context.chest.add(mantle);

  const badge = namedGroup(`npc.faction.${context.faction.id}.${context.faction.motif}-badge`);
  if (context.faction.motif === "leaf") {
    badge.add(mesh("npc.faction.badge.leaf", new THREE.SphereGeometry(0.09, 10, 8), palette.accent, [0, 0, 0], [0.55, 1.2, 0.2]));
    badge.rotation.z = -0.45;
  } else if (context.faction.motif === "sun") {
    badge.add(mesh("npc.faction.badge.sun", new THREE.CylinderGeometry(0.085, 0.085, 0.025, 12), palette.accent).rotateX(Math.PI / 2));
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const ray = mesh(`npc.faction.badge.ray.${index + 1}`, new THREE.ConeGeometry(0.025, 0.09, 4), palette.accent, [Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, 0]);
      ray.rotation.z = angle - Math.PI / 2;
      badge.add(ray);
    }
  } else {
    badge.add(mesh("npc.faction.badge.rune", new THREE.OctahedronGeometry(0.1), palette.accent, [0, 0, 0], [0.7, 1.15, 0.28]));
    addBox(badge, "npc.faction.badge.rune-bar", [0.035, 0.2, 0.025], palette.secondary);
  }
  badge.position.set(0.3, 0.16, 0.5);
  context.chest.add(badge);
}

function createHammer(name: string, palette: Palette): THREE.Group {
  const tool = namedGroup(name);
  addRod(tool, `${name}.handle`, 1.05, 0.045, palette.wood);
  addBox(tool, `${name}.head`, [0.42, 0.2, 0.2], palette.steel, [0, 0.1, 0]);
  return tool;
}

function createSpear(name: string, palette: Palette): THREE.Group {
  const tool = namedGroup(name);
  addRod(tool, `${name}.shaft`, 2.15, 0.035, palette.wood, [0, -0.62, 0]);
  tool.add(mesh(`${name}.point`, new THREE.ConeGeometry(0.11, 0.38, 5), palette.steel, [0, 0.64, 0]));
  tool.add(mesh(`${name}.counterweight`, new THREE.SphereGeometry(0.07, 8, 6), palette.accent, [0, -1.73, 0]));
  return tool;
}

function createStaff(name: string, palette: Palette, ornament: "orb" | "crook" | "branch"): THREE.Group {
  const tool = namedGroup(name);
  addRod(tool, `${name}.shaft`, 1.95, 0.045, palette.wood, [0, -0.55, 0]);
  if (ornament === "orb") {
    tool.add(mesh(`${name}.orb`, new THREE.IcosahedronGeometry(0.16, 1), palette.glass, [0, 0.52, 0]));
    tool.add(mesh(`${name}.halo`, new THREE.TorusGeometry(0.23, 0.025, 7, 20), palette.accent, [0, 0.52, 0]).rotateY(Math.PI / 2));
  } else if (ornament === "crook") {
    const crook = mesh(`${name}.crook`, new THREE.TorusGeometry(0.21, 0.042, 7, 18, Math.PI * 1.45), palette.accent, [0.14, 0.51, 0]);
    crook.rotation.z = 0.4;
    tool.add(crook);
  } else {
    for (const side of [-1, 1]) {
      const branch = addRod(tool, `${name}.branch.${side < 0 ? "R" : "L"}`, 0.45, 0.032, palette.wood, [side * 0.13, 0.46, 0]);
      branch.rotation.z = side * 0.6;
    }
    tool.add(mesh(`${name}.leaf`, new THREE.SphereGeometry(0.12, 9, 7), palette.primary, [0, 0.65, 0], [0.45, 1.15, 0.25]));
  }
  return tool;
}

function createBlade(name: string, palette: Palette, curved = false): THREE.Group {
  const tool = namedGroup(name);
  addRod(tool, `${name}.grip`, 0.35, 0.045, palette.leather, [0, -0.2, 0]);
  const bladeGeometry = curved
    ? new THREE.CylinderGeometry(0.035, 0.11, 0.9, 5)
    : new THREE.BoxGeometry(0.12, 0.92, 0.035);
  const blade = mesh(`${name}.blade`, bladeGeometry, palette.steel, [curved ? 0.12 : 0, 0.43, 0]);
  if (curved) blade.rotation.z = -0.18;
  tool.add(blade);
  addBox(tool, `${name}.guard`, [0.4, 0.07, 0.08], palette.accent, [0, -0.01, 0]);
  return tool;
}

function createBow(name: string, palette: Palette): THREE.Group {
  const bow = namedGroup(name);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.82, 0),
    new THREE.Vector3(0.2, -0.42, 0),
    new THREE.Vector3(0.27, 0, 0),
    new THREE.Vector3(0.2, 0.42, 0),
    new THREE.Vector3(0, 0.82, 0),
  ]);
  bow.add(mesh(`${name}.limbs`, new THREE.TubeGeometry(curve, 18, 0.035, 6), palette.wood));
  addBox(bow, `${name}.string`, [0.012, 1.64, 0.012], palette.secondary);
  addBox(bow, `${name}.grip`, [0.08, 0.28, 0.08], palette.leather, [0.25, 0, 0]);
  return bow;
}

function addMerchant(context: NpcBuildContext, palette: Palette): void {
  const scale = namedGroup("npc.role.merchant.scale");
  addRod(scale, "npc.role.merchant.scale.handle", 0.46, 0.035, palette.accent, [0, -0.16, 0]);
  addBox(scale, "npc.role.merchant.scale.beam", [0.55, 0.035, 0.035], palette.accent, [0, 0.06, 0]);
  for (const side of [-1, 1]) {
    addRod(scale, `npc.role.merchant.scale.chain.${side}`, 0.26, 0.009, palette.dark, [side * 0.22, -0.07, 0]);
    scale.add(mesh(`npc.role.merchant.scale.pan.${side}`, new THREE.CylinderGeometry(0.13, 0.1, 0.025, 12), palette.accent, [side * 0.22, -0.22, 0]));
  }
  context.handRight.add(scale);
  const pack = namedGroup("npc.role.merchant.trade-pack");
  addBox(pack, "npc.role.merchant.trade-pack.crate", [0.72, 0.74, 0.32], palette.wood, [0, -0.12, -0.14]);
  addBox(pack, "npc.role.merchant.trade-pack.roll", [0.82, 0.16, 0.28], palette.primary, [0, 0.36, -0.14]);
  context.back.add(pack);
}

function addBlacksmith(context: NpcBuildContext, palette: Palette): void {
  context.handRight.add(createHammer("npc.role.blacksmith.hammer", palette));
  const apron = namedGroup("npc.role.blacksmith.forge-apron");
  addBox(apron, "npc.role.blacksmith.forge-apron.panel", [0.75, 1.25, 0.06], palette.leather, [0, -0.35, 0.46]);
  for (const side of [-1, 1]) addBox(apron, `npc.role.blacksmith.forge-apron.pocket.${side}`, [0.24, 0.25, 0.08], palette.dark, [side * 0.22, -0.62, 0.51]);
  context.chest.add(apron);
}

function addGuard(context: NpcBuildContext, palette: Palette): void {
  context.handRight.add(createSpear("npc.role.guard.spear", palette));
  const shield = namedGroup("npc.role.guard.tower-shield");
  addBox(shield, "npc.role.guard.tower-shield.face", [0.72, 1.18, 0.14], palette.primary, [0, -0.15, -0.2]);
  shield.add(mesh("npc.role.guard.tower-shield.boss", new THREE.SphereGeometry(0.2, 12, 8), palette.accent, [0, -0.15, -0.1], [1, 1, 0.4]));
  context.back.add(shield);
  const helmet = namedGroup("npc.role.guard.helmet");
  helmet.add(mesh("npc.role.guard.helmet.dome", new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), palette.steel, [0, 0.26, 0]));
  addBox(helmet, "npc.role.guard.helmet.crest", [0.1, 0.55, 0.42], palette.primary, [0, 0.58, -0.08]);
  context.head.add(helmet);
}

function addNoble(context: NpcBuildContext, palette: Palette): void {
  const circlet = namedGroup("npc.role.noble.circlet");
  circlet.add(mesh("npc.role.noble.circlet.band", new THREE.TorusGeometry(0.45, 0.035, 7, 24), palette.accent, [0, 0.2, 0]).rotateX(Math.PI / 2));
  for (const x of [-0.23, 0, 0.23]) circlet.add(mesh(`npc.role.noble.circlet.gem.${x}`, new THREE.OctahedronGeometry(0.07), palette.glass, [x, 0.24 + (x === 0 ? 0.08 : 0), 0.4]));
  context.head.add(circlet);
  const fan = namedGroup("npc.role.noble.fan");
  for (let index = 0; index < 7; index += 1) {
    const blade = addBox(fan, `npc.role.noble.fan.rib.${index + 1}`, [0.06, 0.56, 0.025], index % 2 === 0 ? palette.primary : palette.secondary, [0, -0.22, 0]);
    blade.rotation.z = (index - 3) * 0.13;
  }
  context.handRight.add(fan);
}

function addFarmer(context: NpcBuildContext, palette: Palette): void {
  const hat = namedGroup("npc.role.farmer.straw-hat");
  hat.add(mesh("npc.role.farmer.straw-hat.brim", new THREE.CylinderGeometry(0.72, 0.72, 0.06, 18), palette.secondary, [0, 0.31, 0]));
  hat.add(mesh("npc.role.farmer.straw-hat.crown", new THREE.ConeGeometry(0.42, 0.4, 14), palette.secondary, [0, 0.52, 0]));
  context.head.add(hat);
  const fork = namedGroup("npc.role.farmer.pitchfork");
  addRod(fork, "npc.role.farmer.pitchfork.shaft", 1.9, 0.04, palette.wood, [0, -0.55, 0]);
  addBox(fork, "npc.role.farmer.pitchfork.bar", [0.5, 0.06, 0.06], palette.steel, [0, 0.42, 0]);
  for (const x of [-0.2, 0, 0.2]) addRod(fork, `npc.role.farmer.pitchfork.tine.${x}`, 0.42, 0.022, palette.steel, [x, 0.62, 0]);
  context.handRight.add(fork);
}

function addMiner(context: NpcBuildContext, palette: Palette): void {
  const helmet = namedGroup("npc.role.miner.lamp-helmet");
  helmet.add(mesh("npc.role.miner.lamp-helmet.shell", new THREE.SphereGeometry(0.54, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), palette.primary, [0, 0.25, 0]));
  addBox(helmet, "npc.role.miner.lamp-helmet.brim", [1.0, 0.08, 0.68], palette.dark, [0, 0.22, 0.02]);
  helmet.add(mesh("npc.role.miner.lamp-helmet.lamp", new THREE.SphereGeometry(0.12, 10, 8), palette.glass, [0, 0.35, 0.47]));
  context.head.add(helmet);
  const pickaxe = namedGroup("npc.role.miner.pickaxe");
  addRod(pickaxe, "npc.role.miner.pickaxe.handle", 1.22, 0.045, palette.wood, [0, -0.35, 0]);
  const head = mesh("npc.role.miner.pickaxe.head", new THREE.CylinderGeometry(0.045, 0.14, 0.82, 6), palette.steel, [0, 0.27, 0]);
  head.rotation.z = Math.PI / 2;
  pickaxe.add(head);
  context.handRight.add(pickaxe);
}

function addSailor(context: NpcBuildContext, palette: Palette): void {
  const cap = namedGroup("npc.role.sailor.cap");
  cap.add(mesh("npc.role.sailor.cap.crown", new THREE.CylinderGeometry(0.43, 0.5, 0.22, 14), palette.secondary, [0, 0.33, 0]));
  addBox(cap, "npc.role.sailor.cap.bill", [0.52, 0.06, 0.34], palette.primary, [0, 0.22, 0.31]);
  context.head.add(cap);
  const telescope = namedGroup("npc.role.sailor.telescope");
  const tube = addRod(telescope, "npc.role.sailor.telescope.tube", 0.7, 0.075, palette.accent, [0, -0.18, 0]);
  tube.rotation.z = -0.3;
  telescope.add(mesh("npc.role.sailor.telescope.lens", new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), palette.glass, [0.1, 0.15, 0]).rotateZ(-0.3));
  context.handRight.add(telescope);
  const coil = namedGroup("npc.role.sailor.rope-coil");
  coil.add(mesh("npc.role.sailor.rope-coil.loop", new THREE.TorusGeometry(0.36, 0.07, 7, 22), palette.leather, [0, -0.1, -0.18]));
  context.back.add(coil);
}

function addScholar(context: NpcBuildContext, palette: Palette): void {
  const cap = namedGroup("npc.role.scholar.mortarboard");
  addBox(cap, "npc.role.scholar.mortarboard.board", [0.82, 0.06, 0.82], palette.dark, [0, 0.45, 0]);
  cap.add(mesh("npc.role.scholar.mortarboard.cap", new THREE.CylinderGeometry(0.36, 0.42, 0.25, 12), palette.primary, [0, 0.32, 0]));
  addRod(cap, "npc.role.scholar.mortarboard.tassel", 0.48, 0.018, palette.accent, [0.35, 0.22, 0.05]);
  context.head.add(cap);
  const scroll = namedGroup("npc.role.scholar.scroll");
  addBox(scroll, "npc.role.scholar.scroll.sheet", [0.55, 0.72, 0.035], palette.secondary, [0, -0.2, 0]);
  for (const y of [-0.56, 0.16]) scroll.add(mesh(`npc.role.scholar.scroll.roll.${y}`, new THREE.CylinderGeometry(0.06, 0.06, 0.62, 10), palette.wood, [0, y, 0]).rotateZ(Math.PI / 2));
  context.handRight.add(scroll);
}

function addCleric(context: NpcBuildContext, palette: Palette): void {
  const mitre = namedGroup("npc.role.cleric.mitre");
  mitre.add(mesh("npc.role.cleric.mitre.crown", new THREE.ConeGeometry(0.47, 0.85, 4), palette.secondary, [0, 0.55, 0], [1, 1, 0.72]));
  addBox(mitre, "npc.role.cleric.mitre.emblem", [0.08, 0.38, 0.04], palette.accent, [0, 0.58, 0.37]);
  addBox(mitre, "npc.role.cleric.mitre.emblem-cross", [0.25, 0.07, 0.04], palette.accent, [0, 0.62, 0.37]);
  context.head.add(mitre);
  context.handRight.add(createStaff("npc.role.cleric.crozier", palette, "crook"));
}

function addAlchemist(context: NpcBuildContext, palette: Palette): void {
  const goggles = namedGroup("npc.role.alchemist.goggles");
  for (const x of [-0.17, 0.17]) {
    goggles.add(mesh(`npc.role.alchemist.goggles.lens.${x}`, new THREE.CylinderGeometry(0.13, 0.13, 0.05, 14), palette.glass, [x, 0.08, 0.44]).rotateX(Math.PI / 2));
  }
  addBox(goggles, "npc.role.alchemist.goggles.bridge", [0.16, 0.035, 0.04], palette.accent, [0, 0.08, 0.45]);
  context.head.add(goggles);
  const flask = namedGroup("npc.role.alchemist.flask");
  flask.add(mesh("npc.role.alchemist.flask.body", new THREE.SphereGeometry(0.19, 12, 9), palette.glass, [0, -0.25, 0], [1, 1.2, 1]));
  addRod(flask, "npc.role.alchemist.flask.neck", 0.28, 0.055, palette.glass, [0, -0.02, 0]);
  addBox(flask, "npc.role.alchemist.flask.liquid", [0.27, 0.16, 0.22], palette.primary, [0, -0.34, 0]);
  context.handRight.add(flask);
  const rack = namedGroup("npc.role.alchemist.vial-rack");
  for (let index = 0; index < 5; index += 1) rack.add(mesh(`npc.role.alchemist.vial.${index + 1}`, new THREE.CylinderGeometry(0.045, 0.06, 0.28, 8), index % 2 === 0 ? palette.glass : palette.accent, [(index - 2) * 0.12, -0.1, -0.25]));
  context.back.add(rack);
}

function addBard(context: NpcBuildContext, palette: Palette): void {
  const cap = namedGroup("npc.role.bard.feather-cap");
  cap.add(mesh("npc.role.bard.feather-cap.cap", new THREE.SphereGeometry(0.5, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), palette.primary, [0, 0.25, 0]));
  const feather = mesh("npc.role.bard.feather-cap.feather", new THREE.SphereGeometry(0.12, 10, 8), palette.secondary, [0.34, 0.67, 0], [0.35, 2.2, 0.2]);
  feather.rotation.z = -0.42;
  cap.add(feather);
  context.head.add(cap);
  const lute = namedGroup("npc.role.bard.lute");
  lute.add(mesh("npc.role.bard.lute.body", new THREE.SphereGeometry(0.38, 14, 10), palette.wood, [0, -0.32, -0.2], [0.84, 1.1, 0.38]));
  addRod(lute, "npc.role.bard.lute.neck", 0.84, 0.06, palette.wood, [0, 0.25, -0.2]);
  for (const x of [-0.06, 0, 0.06]) addBox(lute, `npc.role.bard.lute.string.${x}`, [0.01, 1.0, 0.01], palette.secondary, [x, 0.04, 0.02]);
  context.back.add(lute);
}

function addHealer(context: NpcBuildContext, palette: Palette): void {
  const wreath = namedGroup("npc.role.healer.herb-wreath");
  wreath.add(mesh("npc.role.healer.herb-wreath.vine", new THREE.TorusGeometry(0.46, 0.025, 7, 24), palette.primary, [0, 0.22, 0]).rotateX(Math.PI / 2));
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    wreath.add(mesh(`npc.role.healer.herb-wreath.leaf.${index + 1}`, new THREE.SphereGeometry(0.08, 8, 6), palette.accent, [Math.cos(angle) * 0.43, 0.22, Math.sin(angle) * 0.32], [0.4, 1, 0.2]));
  }
  context.head.add(wreath);
  context.handRight.add(createStaff("npc.role.healer.healing-staff", palette, "branch"));
}

function addHunter(context: NpcBuildContext, palette: Palette): void {
  const hood = namedGroup("npc.role.hunter.antler-hood");
  hood.add(mesh("npc.role.hunter.antler-hood.cowl", new THREE.SphereGeometry(0.58, 15, 10, 0, Math.PI * 2, 0, Math.PI / 1.55), palette.dark, [0, 0.15, -0.04]));
  for (const side of [-1, 1]) {
    const antler = addRod(hood, `npc.role.hunter.antler-hood.antler.${side}`, 0.58, 0.035, palette.wood, [side * 0.28, 0.62, -0.08]);
    antler.rotation.z = side * -0.3;
  }
  context.head.add(hood);
  context.handRight.add(createBow("npc.role.hunter.longbow", palette));
}

function addReceptionist(context: NpcBuildContext, palette: Palette): void {
  const beret = namedGroup("npc.role.guild-receptionist.beret");
  beret.add(mesh("npc.role.guild-receptionist.beret.crown", new THREE.SphereGeometry(0.52, 14, 9), palette.primary, [0.08, 0.36, -0.02], [1.05, 0.35, 0.9]));
  beret.add(mesh("npc.role.guild-receptionist.beret.pin", new THREE.OctahedronGeometry(0.08), palette.accent, [0.33, 0.4, 0.28]));
  context.head.add(beret);
  const ledger = namedGroup("npc.role.guild-receptionist.ledger");
  addBox(ledger, "npc.role.guild-receptionist.ledger.cover", [0.56, 0.72, 0.1], palette.primary, [0, -0.26, 0]);
  addBox(ledger, "npc.role.guild-receptionist.ledger.pages", [0.5, 0.66, 0.08], palette.secondary, [0.03, -0.26, 0.06]);
  context.handRight.add(ledger);
}

function addCook(context: NpcBuildContext, palette: Palette): void {
  const toque = namedGroup("npc.role.cook.toque");
  toque.add(mesh("npc.role.cook.toque.band", new THREE.CylinderGeometry(0.43, 0.45, 0.28, 14), palette.secondary, [0, 0.3, 0]));
  for (const x of [-0.28, 0, 0.28]) toque.add(mesh(`npc.role.cook.toque.puff.${x}`, new THREE.SphereGeometry(0.29, 12, 8), palette.secondary, [x, 0.62, 0], [1, 0.85, 0.92]));
  context.head.add(toque);
  const pan = namedGroup("npc.role.cook.pan");
  pan.add(mesh("npc.role.cook.pan.bowl", new THREE.CylinderGeometry(0.34, 0.27, 0.11, 16), palette.dark, [0, -0.2, 0]).rotateX(Math.PI / 2));
  const handle = addRod(pan, "npc.role.cook.pan.handle", 0.72, 0.055, palette.leather, [0, 0.25, 0]);
  handle.rotation.z = -0.12;
  context.handRight.add(pan);
}

function addFisher(context: NpcBuildContext, palette: Palette): void {
  const hat = namedGroup("npc.role.fisher.rain-hat");
  hat.add(mesh("npc.role.fisher.rain-hat.brim", new THREE.ConeGeometry(0.72, 0.32, 16), palette.primary, [0, 0.38, 0]));
  hat.add(mesh("npc.role.fisher.rain-hat.crown", new THREE.CylinderGeometry(0.34, 0.46, 0.24, 14), palette.primary, [0, 0.52, 0]));
  context.head.add(hat);
  const rod = namedGroup("npc.role.fisher.rod");
  const pole = addRod(rod, "npc.role.fisher.rod.pole", 2.15, 0.028, palette.wood, [0, -0.6, 0]);
  pole.rotation.z = -0.14;
  addBox(rod, "npc.role.fisher.rod.line", [0.012, 1.4, 0.012], palette.secondary, [0.28, 0.15, 0]);
  rod.add(mesh("npc.role.fisher.rod.float", new THREE.SphereGeometry(0.06, 8, 6), palette.accent, [0.28, -0.56, 0]));
  context.handRight.add(rod);
  const net = namedGroup("npc.role.fisher.net");
  net.add(mesh("npc.role.fisher.net.frame", new THREE.TorusGeometry(0.38, 0.035, 7, 20), palette.wood, [0, -0.12, -0.2]));
  context.back.add(net);
}

function addStableKeeper(context: NpcBuildContext, palette: Palette): void {
  const cap = namedGroup("npc.role.stable-keeper.flat-cap");
  cap.add(mesh("npc.role.stable-keeper.flat-cap.crown", new THREE.SphereGeometry(0.5, 14, 9), palette.primary, [0, 0.31, -0.05], [1, 0.35, 0.9]));
  addBox(cap, "npc.role.stable-keeper.flat-cap.bill", [0.5, 0.05, 0.3], palette.dark, [0, 0.25, 0.31]);
  context.head.add(cap);
  const brush = namedGroup("npc.role.stable-keeper.grooming-brush");
  addBox(brush, "npc.role.stable-keeper.grooming-brush.block", [0.34, 0.5, 0.13], palette.wood, [0, -0.24, 0]);
  for (let index = 0; index < 5; index += 1) addRod(brush, `npc.role.stable-keeper.grooming-brush.bristle.${index + 1}`, 0.18, 0.02, palette.secondary, [(index - 2) * 0.06, -0.53, 0]);
  context.handRight.add(brush);
  const horseshoes = namedGroup("npc.role.stable-keeper.horseshoes");
  for (const x of [-0.2, 0.2]) horseshoes.add(mesh(`npc.role.stable-keeper.horseshoe.${x}`, new THREE.TorusGeometry(0.18, 0.035, 7, 18, Math.PI * 1.65), palette.steel, [x, -0.18, -0.2]));
  context.back.add(horseshoes);
}

function addLibrarian(context: NpcBuildContext, palette: Palette): void {
  const glasses = namedGroup("npc.role.librarian.spectacles");
  for (const x of [-0.17, 0.17]) glasses.add(mesh(`npc.role.librarian.spectacles.lens.${x}`, new THREE.TorusGeometry(0.13, 0.018, 6, 18), palette.accent, [x, 0.05, 0.43]));
  addBox(glasses, "npc.role.librarian.spectacles.bridge", [0.12, 0.025, 0.025], palette.accent, [0, 0.05, 0.43]);
  context.head.add(glasses);
  const book = namedGroup("npc.role.librarian.open-book");
  for (const side of [-1, 1]) {
    const page = addBox(book, `npc.role.librarian.open-book.page.${side}`, [0.42, 0.62, 0.045], palette.secondary, [side * 0.21, -0.28, 0], [0, side * 0.12, side * -0.15]);
    page.rotation.y = side * -0.1;
  }
  addBox(book, "npc.role.librarian.open-book.spine", [0.08, 0.66, 0.08], palette.primary, [0, -0.28, -0.03]);
  context.handRight.add(book);
}

function addMonk(context: NpcBuildContext, palette: Palette): void {
  const beads = namedGroup("npc.role.monk.prayer-beads");
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    beads.add(mesh(`npc.role.monk.prayer-beads.bead.${index + 1}`, new THREE.SphereGeometry(0.045, 7, 5), palette.wood, [Math.cos(angle) * 0.34, 0.1 + Math.sin(angle) * 0.42, 0.44]));
  }
  context.chest.add(beads);
  context.handRight.add(createStaff("npc.role.monk.pilgrim-staff", palette, "branch"));
  const roll = namedGroup("npc.role.monk.bedroll");
  roll.add(mesh("npc.role.monk.bedroll.roll", new THREE.CylinderGeometry(0.19, 0.19, 0.82, 12), palette.secondary, [0, 0.2, -0.2]).rotateZ(Math.PI / 2));
  context.back.add(roll);
}

function addDesertNomad(context: NpcBuildContext, palette: Palette): void {
  const turban = namedGroup("npc.role.desert-nomad.turban");
  turban.add(mesh("npc.role.desert-nomad.turban.wrap", new THREE.SphereGeometry(0.58, 15, 10), palette.secondary, [0, 0.2, -0.03], [1, 0.8, 0.95]));
  for (let index = 0; index < 4; index += 1) turban.add(mesh(`npc.role.desert-nomad.turban.band.${index + 1}`, new THREE.TorusGeometry(0.49 - index * 0.035, 0.025, 6, 20), index % 2 === 0 ? palette.primary : palette.accent, [0, 0.1 + index * 0.09, 0]).rotateX(Math.PI / 2));
  context.head.add(turban);
  context.handRight.add(createBlade("npc.role.desert-nomad.scimitar", palette, true));
  const skin = namedGroup("npc.role.desert-nomad.water-skin");
  skin.add(mesh("npc.role.desert-nomad.water-skin.body", new THREE.SphereGeometry(0.3, 12, 9), palette.leather, [0.32, -0.2, -0.2], [0.72, 1.15, 0.45]));
  context.back.add(skin);
}

function addNorthernWarrior(context: NpcBuildContext, palette: Palette): void {
  const helm = namedGroup("npc.role.northern-warrior.horned-helm");
  helm.add(mesh("npc.role.northern-warrior.horned-helm.dome", new THREE.SphereGeometry(0.55, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), palette.steel, [0, 0.25, 0]));
  for (const side of [-1, 1]) {
    const horn = mesh(`npc.role.northern-warrior.horned-helm.horn.${side}`, new THREE.ConeGeometry(0.13, 0.62, 8), palette.secondary, [side * 0.42, 0.5, 0]);
    horn.rotation.z = side * -0.75;
    helm.add(horn);
  }
  context.head.add(helm);
  const axe = namedGroup("npc.role.northern-warrior.battle-axe");
  addRod(axe, "npc.role.northern-warrior.battle-axe.handle", 1.45, 0.05, palette.wood, [0, -0.4, 0]);
  axe.add(mesh("npc.role.northern-warrior.battle-axe.blade", new THREE.ConeGeometry(0.34, 0.6, 3), palette.steel, [0.2, 0.3, 0]).rotateZ(-Math.PI / 2));
  context.handRight.add(axe);
  const cape = namedGroup("npc.role.northern-warrior.fur-cape");
  cape.add(mesh("npc.role.northern-warrior.fur-cape.mantle", new THREE.SphereGeometry(0.55, 12, 8), palette.secondary, [0, 0.1, -0.28], [1.2, 0.42, 0.55]));
  context.back.add(cape);
}

function addElvenArtisan(context: NpcBuildContext, palette: Palette): void {
  const ears = namedGroup("npc.role.elven-artisan.ears");
  const skin = material(0xf1bd9d, 0.72);
  for (const side of [-1, 1]) {
    const ear = mesh(`npc.role.elven-artisan.ear.${side}`, new THREE.ConeGeometry(0.12, 0.5, 6), skin, [side * 0.51, 0.02, 0]);
    ear.rotation.z = side * -Math.PI / 2;
    ears.add(ear);
  }
  context.head.add(ears);
  const chisel = namedGroup("npc.role.elven-artisan.chisel");
  addRod(chisel, "npc.role.elven-artisan.chisel.handle", 0.45, 0.055, palette.wood, [0, -0.22, 0]);
  chisel.add(mesh("npc.role.elven-artisan.chisel.point", new THREE.ConeGeometry(0.06, 0.32, 6), palette.steel, [0, 0.16, 0]));
  context.handRight.add(chisel);
  const frame = namedGroup("npc.role.elven-artisan.gem-frame");
  frame.add(mesh("npc.role.elven-artisan.gem-frame.ring", new THREE.TorusGeometry(0.34, 0.035, 7, 22), palette.accent, [0, -0.1, -0.2]));
  frame.add(mesh("npc.role.elven-artisan.gem-frame.gem", new THREE.OctahedronGeometry(0.2), palette.glass, [0, -0.1, -0.2]));
  context.back.add(frame);
}

function addDwarfEngineer(context: NpcBuildContext, palette: Palette): void {
  context.root.scale.set(1.12, 0.84, 1.08);
  const goggles = namedGroup("npc.role.dwarf-engineer.goggles");
  for (const x of [-0.17, 0.17]) goggles.add(mesh(`npc.role.dwarf-engineer.goggles.lens.${x}`, new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14), palette.accent, [x, 0.08, 0.44]).rotateX(Math.PI / 2));
  addBox(goggles, "npc.role.dwarf-engineer.goggles.bridge", [0.16, 0.04, 0.04], palette.leather, [0, 0.08, 0.45]);
  context.head.add(goggles);
  const wrench = namedGroup("npc.role.dwarf-engineer.wrench");
  addRod(wrench, "npc.role.dwarf-engineer.wrench.handle", 0.82, 0.07, palette.steel, [0, -0.35, 0]);
  wrench.add(mesh("npc.role.dwarf-engineer.wrench.jaw", new THREE.TorusGeometry(0.18, 0.065, 6, 14, Math.PI * 1.4), palette.steel, [0, 0.13, 0]));
  context.handRight.add(wrench);
  const gears = namedGroup("npc.role.dwarf-engineer.gear-pack");
  for (const [index, x, y, radius] of [[1, -0.22, 0.05, 0.27], [2, 0.2, -0.15, 0.22], [3, 0.2, 0.24, 0.15]] as const) gears.add(mesh(`npc.role.dwarf-engineer.gear.${index}`, new THREE.TorusGeometry(radius, 0.065, 6, 12), palette.accent, [x, y, -0.25]));
  context.back.add(gears);
}

function addBeastfolkScout(context: NpcBuildContext, palette: Palette): void {
  const ears = namedGroup("npc.role.beastfolk-scout.ears");
  for (const side of [-1, 1]) {
    const ear = mesh(`npc.role.beastfolk-scout.ear.${side}`, new THREE.ConeGeometry(0.19, 0.55, 5), palette.primary, [side * 0.3, 0.58, -0.02]);
    ear.rotation.z = side * -0.18;
    ears.add(ear);
  }
  context.head.add(ears);
  const tail = namedGroup("npc.role.beastfolk-scout.tail");
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.2, -0.25),
    new THREE.Vector3(0.42, -0.45, -0.5),
    new THREE.Vector3(0.6, -0.9, -0.45),
    new THREE.Vector3(0.38, -1.25, -0.2),
  ]);
  tail.add(mesh("npc.role.beastfolk-scout.tail.mesh", new THREE.TubeGeometry(curve, 16, 0.11, 7), palette.primary));
  context.back.add(tail);
  context.handRight.add(createBlade("npc.role.beastfolk-scout.dagger", palette));
}

function addRoleAccessories(context: NpcBuildContext, palette: Palette): void {
  switch (context.archetype.id) {
    case "merchant": addMerchant(context, palette); break;
    case "blacksmith": addBlacksmith(context, palette); break;
    case "guard": addGuard(context, palette); break;
    case "noble": addNoble(context, palette); break;
    case "farmer": addFarmer(context, palette); break;
    case "miner": addMiner(context, palette); break;
    case "sailor": addSailor(context, palette); break;
    case "scholar": addScholar(context, palette); break;
    case "cleric": addCleric(context, palette); break;
    case "alchemist": addAlchemist(context, palette); break;
    case "bard": addBard(context, palette); break;
    case "healer": addHealer(context, palette); break;
    case "hunter": addHunter(context, palette); break;
    case "guild-receptionist": addReceptionist(context, palette); break;
    case "cook": addCook(context, palette); break;
    case "fisher": addFisher(context, palette); break;
    case "stable-keeper": addStableKeeper(context, palette); break;
    case "librarian": addLibrarian(context, palette); break;
    case "monk": addMonk(context, palette); break;
    case "desert-nomad": addDesertNomad(context, palette); break;
    case "northern-warrior": addNorthernWarrior(context, palette); break;
    case "elven-artisan": addElvenArtisan(context, palette); break;
    case "dwarf-engineer": addDwarfEngineer(context, palette); break;
    case "beastfolk-scout": addBeastfolkScout(context, palette); break;
  }
}

function stampMetadata(root: THREE.Object3D, archetype: NpcArchetype, faction: NpcFaction): void {
  root.traverse((node) => {
    node.userData.provenance = "original-procedural";
    node.userData.assetSource = "procedural";
    node.userData.npcArchetype = archetype.id;
    node.userData.npcFaction = faction.id;
    node.userData.quality = "gallery-ready";
    node.userData.attachment = node.parent?.name ?? "scene-root";
  });
}

export function createNpcResource(archetype: NpcArchetype, faction: NpcFaction): NpcResourceGroup {
  const root = createAnimeAvatar({
    body: archetype.body,
    classId: archetype.classId,
    outfitId: "outfit.traveler",
  }) as NpcResourceGroup;
  root.name = `npc.${faction.id}.${archetype.id}`;

  const runtime = root.userData.sculptRuntime;
  const chest = runtime.nodes["outfit.mount.chest"];
  if (!chest) throw new Error("NPC avatar is missing the chest attachment mount");
  const context: NpcBuildContext = {
    root,
    archetype,
    faction,
    head: runtime.sockets.head,
    handRight: runtime.sockets["hand.R"],
    handLeft: runtime.sockets["hand.L"],
    back: runtime.sockets.back,
    chest,
  };
  const palette = createPalette(faction);
  addFactionDress(context, palette);
  addRoleAccessories(context, palette);
  stampMetadata(root, archetype, faction);

  const nodes = collectNamedNodes(root);
  root.userData.sculptRuntime = { ...runtime, nodes };
  root.userData.npcResource = {
    id: root.name,
    archetypeId: archetype.id,
    factionId: faction.id,
    provenance: "original-procedural",
    quality: "gallery-ready",
    socketContract: ["hand.R", "hand.L", "head", "back"],
    signatureParts: archetype.signatureParts,
  };
  root.userData.img2threejs = {
    pipeline: "reference-free-procedural-npc-suite",
    pass: "catalog-silhouette",
    reference: "project-anime-field-rpg-visual-language",
    headUnits: archetype.id === "dwarf-engineer" ? 4.2 : 5,
  };
  return root;
}

export function disposeNpcResource(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.forEach((entry) => materials.add(entry));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((entry) => entry.dispose());
  root.userData.disposed = true;
}
