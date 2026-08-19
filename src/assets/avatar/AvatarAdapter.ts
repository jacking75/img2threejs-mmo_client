import * as THREE from "three";
import { collectNamedNodes } from "../geometry";
import type { AvatarAnimationRuntime, SculptRuntime } from "../types";

const CANONICAL_RUNTIME_NODES = [
  "chest",
  "head",
  "back",
  "pelvis",
  "arm.L.upper",
  "arm.L.lower",
  "hand.L",
  "arm.R.upper",
  "arm.R.lower",
  "hand.R",
  "leg.L.upper",
  "leg.L.lower",
  "ankle.L",
  "leg.R.upper",
  "leg.R.lower",
  "ankle.R",
  "body.continuous",
] as const;

const CLIP_ALIASES = {
  idle: ["idle", "stand", "breathing"],
  run: ["run", "jog"],
  sprint: ["sprint", "dash", "runfast"],
  attack_1: ["attack1", "attack", "slash", "swordattack"],
} as const;

export interface AdaptedImportedAvatar {
  readonly runtime: SculptRuntime;
  readonly animation: AvatarAnimationRuntime;
}

export interface ImportedAvatarAdapterConfig {
  /** canonical 이름별로 DCC/외부 리그의 실제 노드 이름 후보를 추가한다. */
  readonly nodeAliases?: Readonly<Record<string, readonly string[] | undefined>>;
}

/** GLB 노드 이름을 런타임의 단일 소켓/관절 계약으로 변환한다. */
export function adaptImportedAvatar(
  scene: THREE.Object3D,
  animations: readonly THREE.AnimationClip[],
  config: ImportedAvatarAdapterConfig = {},
): AdaptedImportedAvatar {
  const importedNodes = collectNamedNodes(scene);
  const resolveNode = (canonicalName: string): THREE.Object3D => requiredImportedNode(
    importedNodes,
    canonicalName,
    config.nodeAliases?.[canonicalName],
  );
  const chest = resolveNode("chest");
  const outfitRootMount = createMount("outfit.mount.root", scene);
  const outfitChestMount = createMount("outfit.mount.chest", chest);
  const sockets = {
    "hand.R": createImportedSocket(resolveNode("hand.R"), "socket.hand.R", [0, 0.16, 0]),
    "hand.L": createImportedSocket(resolveNode("hand.L"), "socket.hand.L", [0, 0.16, 0]),
    head: createImportedSocket(resolveNode("head"), "socket.head", [0, 0.36, 0]),
    back: createImportedSocket(resolveNode("back"), "socket.back", [0, 0, 0]),
  };
  const nodes = withCanonicalRigNames(collectNamedNodes(scene), config);
  nodes["outfit.mount.root"] = outfitRootMount;
  nodes["outfit.mount.chest"] = outfitChestMount;

  return {
    runtime: {
      nodes,
      sockets,
      colliders: [resolveNode("body.continuous")],
      destructionGroups: {
        body: ["body.continuous", "head", "chest", "pelvis"],
        limbs: ["arm.L.upper", "arm.R.upper", "leg.L.upper", "leg.R.upper"],
        equipment: ["socket.hand.R", "socket.back"],
        hair: ["hair.crown-mass", "hair.rear-mass", "hair.ponytail.1"],
        outfit: ["outfit.mount.root", "outfit.mount.chest", "outfit.warrior.tunic"],
      },
    },
    animation: new ImportedAnimationRuntime(scene, animations),
  };
}

export function requiredImportedNode(
  nodes: Readonly<Record<string, THREE.Object3D>>,
  canonicalName: string,
  aliases: readonly string[] = [],
): THREE.Object3D {
  const normalizedTargets = [canonicalName, ...aliases].map(normalizeName);
  const node = Object.entries(nodes).find(([name]) => normalizedTargets.includes(normalizeName(name)))?.[1];
  if (!node) throw new Error(`Imported avatar node is missing: ${canonicalName}`);
  return node;
}

class ImportedAnimationRuntime implements AvatarAnimationRuntime {
  public readonly clipNames: readonly string[];
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<keyof typeof CLIP_ALIASES, THREE.AnimationAction>();
  private currentState: keyof typeof CLIP_ALIASES | null = null;

  public constructor(root: THREE.Object3D, clips: readonly THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    this.clipNames = clips.map(({ name }) => name);
    for (const state of Object.keys(CLIP_ALIASES) as Array<keyof typeof CLIP_ALIASES>) {
      const clip = clips.find(({ name }) => matchesClip(name, CLIP_ALIASES[state]));
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      if (state === "attack_1") {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(state, action);
    }
  }

  public update(state: keyof typeof CLIP_ALIASES, deltaSeconds: number): boolean {
    const action = this.actions.get(state);
    if (!action) {
      if (this.currentState !== null) this.actions.get(this.currentState)?.stop();
      this.currentState = null;
      return false;
    }
    if (this.currentState !== state) {
      if (this.currentState !== null) this.actions.get(this.currentState)?.fadeOut(0.12);
      action.reset().fadeIn(0.12).play();
      this.currentState = state;
    }
    this.mixer.update(Math.max(deltaSeconds, 0));
    return true;
  }

  public dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
    this.actions.clear();
  }
}

function withCanonicalRigNames(
  nodes: Readonly<Record<string, THREE.Object3D>>,
  config: ImportedAvatarAdapterConfig,
): Record<string, THREE.Object3D> {
  const canonical = { ...nodes };
  for (const name of CANONICAL_RUNTIME_NODES) {
    canonical[name] = requiredImportedNode(nodes, name, config.nodeAliases?.[name]);
  }
  return canonical;
}

function createMount(name: string, parent: THREE.Object3D): THREE.Group {
  const mount = new THREE.Group();
  mount.name = name;
  parent.add(mount);
  return mount;
}

function createImportedSocket(
  parent: THREE.Object3D,
  name: string,
  position: readonly [number, number, number],
): THREE.Group {
  const socket = new THREE.Group();
  socket.name = name;
  socket.position.fromArray(position);
  parent.add(socket);
  return socket;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesClip(name: string, aliases: readonly string[]): boolean {
  const normalized = normalizeName(name);
  return aliases.some((alias) => normalized === alias || normalized.endsWith(alias));
}
