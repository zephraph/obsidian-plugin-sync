const { globalExternals } = require('@fal-works/esbuild-plugin-global-externals')
const esbuild = require('esbuild')

const globals = {
  codemirror: 'CodeMirror'
}

esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: "dist/main.js",
  bundle: true,
  format: 'cjs',
  external: ['obsidian'],
  plugins: [globalExternals(globals)]
})
