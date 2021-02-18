import { Setting, SettingTab } from 'obsidian'
import cm from 'codemirror'

export interface PluginSettings {
  templates: { [pattern: string]: string }
}

export class PluginSettingsTab extends SettingTab {
  display(): void {
    let { containerEl } = this

    const setting = new Setting(containerEl).setName('Add template').settingEl

    cm(setting, { mode: 'javascript' })
  }
}
