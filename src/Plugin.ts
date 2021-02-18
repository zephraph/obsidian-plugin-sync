import { Plugin, PluginManifest } from "obsidian";
import path from "path";
import {
  failIf,
  read,
  fileStats,
  to,
  mapValues,
  mkdir,
  ignoreFail,
  resToReadable,
  toReadFromPath,
  listDirs,
  unique,
  toWriteToPath,
} from "./utils";
import fs from "fs";
import { Logger } from "./Logger";

interface PluginSyncRecord {
  version: string;
  data?: object;
  lastUpdated: Date;
}
interface PluginSyncData {
  [pluginID: string]: PluginSyncRecord;
}

interface PluginRegistryRecord {
  id: string;
  name: string;
  author: string;
  description: string;
  repo: string;
}

const PLUGIN_DATA_FILE = "plugin-sync.json";

export class PluginSyncPlugin extends Plugin {
  private vaultPath: string;
  private pluginRegistry: PluginRegistryRecord[];
  private log: Logger;

  private getPluginPath(plugin?: string) {
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
      const [, rawData] = await toReadFromPath(
        this.getPluginPath(plugin),
        "data.json"
      );
      const record: PluginSyncRecord = {
        version: manifest.version,
        data: rawData ? JSON.parse(rawData) : undefined,
        lastUpdated: (await fileStats(manifestPath)).mtime,
      };
      this.log.info(`Successfully fetched plugin from disk`);
      this.log.table(record);
      return record;
    }
    throw new Error(
      `Couldn't get data on installed plugin ${plugin} because vaultPath was not defined`
    );
  }

  private async installPlugin(pluginID: string, version: string) {
    this.log.info("Attempting to install...");
    if (!this.pluginRegistry) {
      this.log.info(
        "Fetching the plugin registry... (this should only happen once)"
      );
      const REGISTRY_URL =
        "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";
      const [pluginRegistryFetchError, pluginRegistry] = await to(
        fetch(REGISTRY_URL).then((response) => response.json())
      );
      failIf(
        pluginRegistryFetchError,
        "Failed to fetch the plugin registry from github"
      );
      this.pluginRegistry = pluginRegistry;
      this.log.info("Plugin registry downloaded");
    }

    const plugin = this.pluginRegistry.find((p) => p.id === pluginID);

    failIf(
      !plugin,
      `Unable to install, it wasn't found in the registry. You'll have to install it manually.`
    );

    this.log.info("plugin found in registry");

    // docs: https://docs.github.com/en/rest/reference/repos#get-a-release-by-tag-name
    const [pluginReleaseFetchError, pluginReleaseInfo] = await to(
      fetch(
        `https://api.github.com/repos/${plugin.repo}/releases/tags/${version}`,
        {
          method: "GET",
          headers: { Accept: "application/vnd.github.v3+json" },
        }
      ).then((response) => response.json())
    );

    failIf(
      pluginReleaseFetchError,
      `Failed to get release information from GitHub. You should install this plugin manually.`
    );

    this.log.info(`retrieved release info from ${plugin.repo}`);

    // TODO: Maybe add some better types for this.
    await Promise.all(
      pluginReleaseInfo.assets
        .filter(
          (asset: any) =>
            asset.name.endsWith(".js") || asset.name.endsWith(".json")
        )
        .map((asset: any) =>
          fetch(asset.browser_download_url).then(async (res) => {
            const pluginPath = this.getPluginPath(pluginID);
            await ignoreFail(mkdir(pluginPath, { recursive: true }));

            const outputFileStream = fs.createWriteStream(
              path.join(this.getPluginPath(pluginID), asset.name)
            );
            const downloadStream = resToReadable(res);
            downloadStream.pipe(outputFileStream);

            return new Promise((resolve, reject) => {
              outputFileStream.on("error", reject);
              downloadStream.on("error", reject);
              downloadStream.on("end", resolve);
            });
          })
        )
    );
    this.log.info("successfully installed");
  }

  private async sync() {
    const pluginSyncData = await this.loadData();
    const syncPlugins = Object.keys(pluginSyncData);

    const pluginsPath = path.join(this.vaultPath, ".obsidian", "plugins");
    const installedPlugins = await listDirs(pluginsPath);

    const allPlugins = unique(installedPlugins, syncPlugins);

    for (const plugin of allPlugins) {
      this.log.endGroup();
      this.log.startGroup(plugin);

      const isPluginSynced = plugin in pluginSyncData;
      const isPluginInstalled = installedPlugins.includes(plugin);

      this.log.info("is in sync file?", isPluginSynced);
      this.log.info("is installed?", isPluginInstalled);

      if (isPluginInstalled) {
        const [installedFetchError, installedPlugin] = await to(
          this.getInstalledPlugin(plugin)
        );
        if (installedFetchError) {
          this.log.error(`Failed to read info on disk: ${installedFetchError}`);
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
          this.log.info("Adding plugin to sync data");
          pluginSyncData[plugin] = installedPlugin;
        }
      } else {
        await this.installPlugin(plugin, pluginSyncData[plugin].version);
      }
    }
    this.log.endGroup();
    this.saveData(pluginSyncData);
  }

  async onload() {
    this.log = new Logger("Plugin Sync");
    const { vault } = this.app.vault.getRoot();
    /**
     * This is technical a private API. `vault.path` for whatever reason is returning `/`.
     * TODO: Find an alternative
     */
    const vaultPath = (vault.adapter as any).basePath;
    if (!vaultPath) {
      this.log.error("Unable to load, vault path not found");
      return;
    }
    this.log.info("vault path successfully read", vaultPath);
    this.vaultPath = vaultPath;
    await this.sync();
  }

  async loadData(): Promise<PluginSyncData> {
    const [readError, data] = await toReadFromPath(
      this.vaultPath,
      ".obsidian",
      PLUGIN_DATA_FILE
    );
    if (readError || !data) {
      return {};
    }
    return mapValues<any, PluginSyncRecord>(
      JSON.parse(data),
      (pluginRecord) => ({
        ...pluginRecord,
        lastUpdated: new Date(pluginRecord.lastUpdated),
      })
    );
  }

  async saveData(data: any): Promise<void> {
    this.log.info("Writing sync data");
    await toWriteToPath(data, this.vaultPath, ".obsidian", PLUGIN_DATA_FILE);
  }
}
