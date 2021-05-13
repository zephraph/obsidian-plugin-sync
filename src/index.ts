import { Plugin, PluginManifest } from "obsidian";
import path from "path";
import {
  to,
  toWrite,
  failIf,
  read,
  toRead,
  fileStats,
  toReadJSON,
  installPluginFromRegistry,
  isPluginInstalled,
} from "obsidian-utils";
import { mapValues, listDirs, unique } from "./utils";
import { log } from "./Logger";

export interface PluginSyncRecord {
  version: string;
  data?: object;
  lastUpdated: Date;
}
export interface PluginSyncData {
  [pluginID: string]: PluginSyncRecord;
}

const PLUGIN_DATA_FILE = "plugin-sync.json";

export default class PluginSyncPlugin extends Plugin {
  public vaultPath: string;
  public pluginRegistry: PluginRegistry;

  public getPluginPath(plugin?: string) {
    const pluginsPath = path.join(this.vaultPath, ".obsidian", "plugins");
    if (!plugin) {
      return pluginsPath;
    }
    return path.join(pluginsPath, plugin);
  }

  private async getInstalledPlugin(plugin: string): Promise<PluginSyncRecord> {
    if (this.vaultPath) {
      const manifestPath = path.join(
        this.getPluginPath(plugin),
        "manifest.json"
      );
      const [manifestReadError, rawManifest] = await to(
        read(manifestPath, "utf-8")
      );
      failIf(
        manifestReadError,
        `Manifest failed to load: ${manifestReadError}`
      );
      const manifest: PluginManifest = JSON.parse(rawManifest);
      const [, rawData] = await toRead(this.getPluginPath(plugin), "data.json");
      const record: PluginSyncRecord = {
        version: manifest.version,
        data: rawData ? JSON.parse(rawData) : undefined,
        lastUpdated: (await fileStats(manifestPath)).mtime,
      };
      log.info(`Successfully fetched plugin from disk`);
      log.table(record);
      return record;
    }
    throw new Error(
      `Couldn't get data on installed plugin ${plugin} because vaultPath was not defined`
    );
  }

  private async installPlugin(pluginID: string, version: string) {
    await installPlugin(
      this.pluginRegistry,
      pluginID,
      version,
      this.getPluginPath()
    );
  }

  private async sync() {
    const pluginSyncData = await this.loadData();
    const syncPlugins = Object.keys(pluginSyncData);

    const pluginsPath = path.join(this.vaultPath, ".obsidian", "plugins");
    const installedPlugins = await listDirs(pluginsPath);

    const allPlugins = unique(installedPlugins, syncPlugins);

    for (const plugin of allPlugins) {
      log.endGroup();
      log.startGroup(plugin);

      const isPluginSynced = plugin in pluginSyncData;
      const isPluginInstalled = installedPlugins.includes(plugin);

      log.info("is in sync file?", isPluginSynced);
      log.info("is installed?", isPluginInstalled);

      if (isPluginInstalled) {
        const [installedFetchError, installedPlugin] = await to(
          this.getInstalledPlugin(plugin)
        );
        if (installedFetchError) {
          log.error(`Failed to read info on disk: ${installedFetchError}`);
          continue;
        }
        if (isPluginSynced) {
          const syncedPlugin = pluginSyncData[plugin];
          if (installedPlugin.version > syncedPlugin.version) {
            pluginSyncData[plugin] = installedPlugin;
          } else if (installedPlugin.version === syncedPlugin.version) {
            pluginSyncData[plugin] =
              installedPlugin.lastUpdated > syncedPlugin.lastUpdated
                ? installedPlugin
                : syncedPlugin;
          }
        } else {
          log.info("Adding plugin to sync data");
          pluginSyncData[plugin] = installedPlugin;
        }
      } else {
        await this.installPlugin(plugin, pluginSyncData[plugin].version);
      }
    }
    log.endGroup();
    this.saveData(pluginSyncData);
  }

  async onload() {
    this.app.vault.adapter;
    const { vault } = this.app.vault.getRoot();
    /**
     * This is technical a private API. `vault.path` for whatever reason is returning `/`.
     * TODO: Find an alternative
     */
    const vaultPath = (vault.adapter as any).basePath;
    if (!vaultPath) {
      log.error("Unable to load, vault path not found");
      return;
    }
    log.info("vault path successfully read", vaultPath);
    this.vaultPath = vaultPath;
    await this.sync();
  }

  async loadData(): Promise<PluginSyncData> {
    const [readError, data] = await toReadJSON(
      this.vaultPath,
      ".obsidian",
      PLUGIN_DATA_FILE
    );
    if (readError || !data) {
      return {};
    }
    return mapValues<any, PluginSyncRecord>(data, (pluginRecord) => ({
      ...pluginRecord,
      lastUpdated: new Date(pluginRecord.lastUpdated),
    }));
  }

  async saveData(data: any): Promise<void> {
    log.info("Writing sync data");
    await toWrite(data, this.vaultPath, ".obsidian", PLUGIN_DATA_FILE);
  }
}
