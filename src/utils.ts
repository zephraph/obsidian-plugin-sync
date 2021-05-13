import path from "path";
import { readDir, to, write } from "obsidian-utils";

export const unique = (arr1: string[], arr2: string[]) =>
  Array.from(new Set([...arr1, ...arr2]));

export const interleave = (strings: string[], ...args: any[]) => {
  return strings.map((str, i) => str + (args[i] || "")).join("");
};

export const listDirs = async (dirPath: string) =>
  (await readDir(dirPath, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

export const toWrite = (data: any, ...pathParts: string[]) =>
  to(write(path.join(...pathParts), JSON.stringify(data)));

export const ignoreFail = (p: Promise<any>) => p.catch(() => {});

export const mapValues = <T, R>(
  o: { [key: string]: T },
  mapFn: (value: T) => R
): { [key: string]: R } => {
  return Object.fromEntries(
    Object.entries(o).map(([key, value]) => [key, mapFn(value)])
  );
};
