import path from "path";
import esbuild from "esbuild";

import fs from "fs/promises";

esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: path.join("dist", "main.js"),
  bundle: true,
  format: "cjs",
  platform: "node",
  external: ["obsidian"],
});

await fs.copyFile("./manifest.json", "dist/manifest.json");
