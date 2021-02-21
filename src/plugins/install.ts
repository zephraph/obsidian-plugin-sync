import { PluginRegistry } from "./registry";
import { log } from "../Logger";
import { failIf, ignoreFail, mkdir, resToReadable, to } from "../utils";
import fs from "fs";
import path from "path";

export async function installPlugin(
  registry: PluginRegistry,
  pluginID: string,
  version: string
) {
  log.info("Attempting to install...");
  const plugin = await registry.getPlugin(pluginID);

  failIf(
    !plugin,
    `Unable to install, it wasn't found in the registry. You'll have to install it manually.`
  );

  log.info("plugin found in registry");

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

  log.info(`retrieved release info from ${plugin.repo}`);

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
  log.info("successfully installed");
}
