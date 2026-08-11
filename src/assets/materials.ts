import * as THREE from "three";
import type { CharacterClass } from "./types";

export const CLASS_PALETTES = {
  warrior: {
    primary: 0x315d8d,
    secondary: 0xe8e3d6,
    accent: 0xc7a55b,
    dark: 0x26374f,
  },
  mage: {
    primary: 0x4b3b86,
    secondary: 0xd8d0ad,
    accent: 0xcaa65b,
    dark: 0x27223f,
  },
  ranger: {
    primary: 0x526942,
    secondary: 0xc7b98a,
    accent: 0xa67a42,
    dark: 0x29372a,
  },
} as const satisfies Record<CharacterClass, Record<string, number>>;

export const COMMON_COLORS = {
  skin: 0xf1bd9d,
  skinShade: 0xd98f78,
  eyeWhite: 0xf8f2e8,
  eyeDark: 0x202535,
  leather: 0x5a3e2c,
  leatherLight: 0x8a6241,
  metal: 0xbcc8cf,
  metalDark: 0x58636d,
  wood: 0x624226,
} as const;

export function toon(color: number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color });
}

export function standard(
  color: number,
  roughness = 0.68,
  metalness = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function metal(color: number = COMMON_COLORS.metal): THREE.MeshStandardMaterial {
  return standard(color, 0.28, 0.82);
}
