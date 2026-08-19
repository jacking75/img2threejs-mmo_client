import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const gltf = readPublicGlbJson("public/assets/characters/female-warrior.glb");

describe("female-warrior.glb contract", () => {
  it("keeps the current animation-less asset on procedural animation fallback", () => {
    expect(gltf.animations ?? []).toHaveLength(0);
  });

  it("contains dedicated skinned outfit variants for imported outfit switching", () => {
    const nodes = gltf.nodes;
    const traveler = nodes.find(({ name }) => name === "outfit.traveler.coat");
    const starter = nodes.filter(({ name }) => name?.startsWith("outfit.warrior."));

    expect(traveler?.skin).toBeTypeOf("number");
    expect(starter.length).toBeGreaterThan(0);
  });
});

interface GlbReference {
  readonly animations?: readonly unknown[];
  readonly nodes: readonly {
    readonly name?: string;
    readonly skin?: number;
  }[];
}

function readPublicGlbJson(path: string): GlbReference {
  const bytes = readFileSync(path);
  const jsonChunkLength = bytes.readUInt32LE(12);
  if (bytes.toString("ascii", 16, 20) !== "JSON") throw new Error("GLB JSON chunk is missing");
  return JSON.parse(bytes.toString("utf8", 20, 20 + jsonChunkLength)) as GlbReference;
}
