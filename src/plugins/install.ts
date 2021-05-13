import { PluginRegistry } from "./registry";
import { log } from "../Logger";
import { failIf, to } from "obsidian-utils";
import path from "path";
import { fetchToDisk } from "utils";

export async function installPlugin(
  registry: PluginRegistry,
  pluginID: string,
  version: string,
  pluginPath: string
) {
  log.debug("Attempting to install...");
  const plugin = await registry.getPlugin(pluginID);

  failIf(
    !plugin,
    `Unable to install, it wasn't found in the registry. You'll have to install it manually.`
  );

  log.debug("plugin found in registry");

  interface PluginReleaseInfo {
    assets: Array<{
      name: string;
      browser_download_url: string;
    }>;
  }

  // docs: https://docs.github.com/en/rest/reference/repos#get-a-release-by-tag-name
  const [
    pluginReleaseFetchError,
    pluginReleaseInfo,
  ] = await to<PluginReleaseInfo>(
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

  log.debug(`retrieved release info from ${plugin.repo}`);

  await Promise.all(
    pluginReleaseInfo.assets
      .filter((asset) =>
        [".js", ".json", ".css"].some((ext) => asset.name.endsWith(ext))
      )
      .map((asset) =>
        fetchToDisk(
          asset.browser_download_url,
          path.join(pluginPath, asset.name)
        )
      )
  );
  log.info("successfully installed");
}
