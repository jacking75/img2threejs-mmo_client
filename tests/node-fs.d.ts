declare module "node:fs" {
  interface BinaryFile {
    readUInt32LE(offset: number): number;
    toString(encoding?: string, start?: number, end?: number): string;
  }

  export function readFileSync(path: string): BinaryFile;
}
