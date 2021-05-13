import path from "path";
import { failIf, fileStats, read, to, toRead } from "obsidian-utils";
import { log } from "../Logger";

import type { PluginManifest } from "obsidian";

interface InstalledPluginInfo {
  manifest: PluginManifest;
  data?: object;
  lastUpdated: Date;
}

/**
 * @param pluginsDirPath Path to the plugins directory in your vault. Usually something like `/path/to/vault/.obsidian/plugins`.
 * @param pluginID The ID of the plugin to read
 */
export async function readPluginFromDisk(
  pluginsDirPath: string,
  pluginID: string
) {
  const manifestPath = path.join(pluginsDirPath, pluginID, "manifest.json");
  const [manifestReadError, rawManifest] = await to(
    read(manifestPath, "utf-8")
  );
  failIf(manifestReadError, `Manifest failed to load: ${manifestReadError}`);
  const manifest: PluginManifest = JSON.parse(rawManifest);
  const [, rawData] = await toRead(pluginsDirPath, pluginID, "data.json");
  const results: InstalledPluginInfo = {
    manifest,
    data: rawData ? JSON.parse(rawData) : undefined,
    lastUpdated: (await fileStats(manifestPath)).mtime,
  };
  log.info(`Successfully fetched plugin from disk`);
  log.table(results);
  return results;
}
