import path from "path";
import esbuild from "esbuild";

const globals = {
  codemirror: "CodeMirror",
};

esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: path.join("dist", "main.js"),
  bundle: true,
  format: "cjs",
  plugins: [globalExternals(globals)],
  platform: "node",
  external: ["obsidian"],
});
