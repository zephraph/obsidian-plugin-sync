import fs from "fs";
import path from "path";
import { promisify } from "util";
import { Readable } from "stream";

export const readDir = promisify(fs.readdir);
export const write = promisify(fs.writeFile);
export const read = promisify(fs.readFile);
export const fileStats = promisify(fs.stat);
export const mkdir = promisify(fs.mkdir);

export const unique = (arr1: string[], arr2: string[]) =>
  Array.from(new Set([...arr1, ...arr2]));

export const interleave = (strings: string[], ...args: any[]) => {
  return strings.map((str, i) => str + (args[i] || "")).join("");
};

export const listDirs = async (dirPath: string) =>
  (await readDir(dirPath, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

export const to = <T>(p: Promise<T>) => {
  return p.then((v) => [null, v]).catch((e) => [e, null]) as
    | Promise<[null, T]>
    | Promise<[any, null]>;
};

export const toReadFromPath = (...pathParts: string[]) =>
  to(read(path.join(...pathParts), "utf-8"));

export const toWriteToPath = (data: any, ...pathParts: string[]) =>
  to(write(path.join(...pathParts), JSON.stringify(data)));

export const ignoreFail = (p: Promise<any>) => p.catch(() => {});

export const failIf = (condition: boolean, message: string) => {
  if (condition) throw new Error(message);
};

export const mapValues = <T, R>(
  o: { [key: string]: T },
  mapFn: (value: T) => R
): { [key: string]: R } => {
  return Object.fromEntries(
    Object.entries(o).map(([key, value]) => [key, mapFn(value)])
  );
};

/**
 * Converts a web fetch response to a node readable stream
 */
export const resToReadable = (res: Response) => {
  const reader = res.body.getReader();
  const readable = new Readable();
  readable._read = async () => {
    const { done, value } = await reader.read();
    readable.push(done ? null : Buffer.from(value));
  };
  return readable;
};
