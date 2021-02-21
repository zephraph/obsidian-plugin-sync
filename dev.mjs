import fs from "fs/promises";
import {
  existsSync as exists,
  readFileSync,
  writeFileSync,
  mkdirSync,
  watch,
} from "fs";
import prompts from "prompts";
import path from "path";

import esbuild from "esbuild";

const manifest = JSON.parse(await fs.readFile("./manifest.json", "utf-8"));

let buildInfo = exists(".build-info")
  ? JSON.parse(await fs.readFile(".build-info", "utf-8"))
  : {};

const copyConfig = () => {
  const newManifest = readFileSync("./manifest.json", "utf-8");
  if (!exists(buildInfo.pluginPath)) {
    mkdirSync(buildInfo.pluginPath, { recursive: true });
  }
  writeFileSync(path.join(buildInfo.pluginPath, "manifest.json"), newManifest);
};

const updateVaultPath = async () => {
  const { vaultPath } = await prompts({
    type: "text",
    name: "vaultPath",
    message: "Enter the absolute path to your vault",
  });
  buildInfo.vaultPath = path.normalize(vaultPath);
  if (!exists(buildInfo.vaultPath)) {
    console.error("The vault path you entered doesn't exist");
    return updateVaultPath();
  }
  buildInfo.pluginPath = path.join(
    buildInfo.vaultPath,
    ".obsidian",
    "plugins",
    manifest.id
  );
  await fs.writeFile(".build-info", JSON.stringify(buildInfo, null, 2));
};

const confirmVaultPath = async () => {
  const { correctPath } = await prompts({
    type: "confirm",
    name: "correctPath",
    message: `is ${buildInfo.vaultPath} the correct vault path?`,
  });
  if (!correctPath) {
    await updateVaultPath();
  }
};

buildInfo.vaultPath && buildInfo.pluginPath
  ? await confirmVaultPath()
  : await updateVaultPath();

copyConfig();

watch("./manifest.json", (eventType) => {
  if (eventType === "change") {
    copyConfig();
  }
});

await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: path.join(buildInfo.pluginPath || "dist", "main.js"),
  bundle: true,
  format: "cjs",
  platform: "node",
  external: ["obsidian"],
  watch: true,
});
