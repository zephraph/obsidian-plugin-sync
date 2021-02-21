# Obsidian Plugin Sync Plugin

This [Obsidian](https://obsidian.md) plugin helps you synchronize installed plugins/settings between different installs, especially if you're using
the (obsidian git sync plugin)[https://github.com/denolehov/obsidian-git].

This is an experimental project, isn't really ready for prime time.

## How it works

When you install and active this plugin, it creates a `plugin-sync.json` file inside the `.obsidian` directory of your vault. This json file will contain the version and data for any currently installed plugin. You can sync this file and ignore the `plugins` directory. On another computer all you need to do is finish your sync, reinstall this one plugin, and load it to get all your other plugins (with their config) back!
