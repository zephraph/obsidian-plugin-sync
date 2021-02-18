import { Plugin } from 'obsidian'
import { PluginSettings, PluginSettingsTab } from './Settings'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

const readDir = promisify(fs.readdir)
const write = promisify(fs.writeFile)
const read = promisify(fs.readFile)

const to = <T>(p: Promise<T>) => {
  return p.then((v) => [null, v]).catch((e) => [e, null]) as
    | Promise<[null, T]>
    | Promise<[any, null]>
}

interface PluginSyncData {
  [pluginID: string]: {
    version: string
    data?: object
  }
}

const PLUGIN_DATA_FILE = 'plugin-sync.json'

export class PluginSyncPlugin extends Plugin {
  public settings: PluginSettings
  private vaultPath: string

  async onload() {
    const { vault } = this.app.vault.getRoot()
    /**
     * This is technical a private API. `vault.path` for whatever reason is returning `/`.
     * TODO: Find an alternative
     */
    const vaultPath = (vault.adapter as any).basePath
    this.vaultPath = vaultPath

    const data = await this.loadData()

    const pluginsPath = path.join(vaultPath, '.obsidian', 'plugins')
    const plugins = (await readDir(pluginsPath, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((p) => p !== this.manifest.id)
    console.log(plugins)
  }

  async loadData(): Promise<PluginSyncData> {
    if (this.vaultPath) {
      const [readError, data] = await to(
        read(path.join(this.vaultPath, '.obsidian', PLUGIN_DATA_FILE), 'utf-8')
      )
      if (readError || !data) {
        return {}
      }
      return JSON.parse(data)
    }
    return {}
  }

  async saveData(data: any): Promise<void> {
    if (this.vaultPath) {
    }
  }
}
