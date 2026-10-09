import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type PublisherExportPlugin from "./main";
import type { PublisherSettings } from "./types";

export const DEFAULT_SETTINGS: PublisherSettings = {
  jekyllRootPath: "",
  jekyllPostsFolder: "_posts",
  jekyllAssetsFolder: "assets/posts",
  pngScale: 2,
  imageBackground: true
};

export class PublisherSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: PublisherExportPlugin) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName("Publisher Export").setHeading();

    new Setting(containerEl)
      .setName("Jekyll 项目目录")
      .setDesc("可选择电脑上的任意文件夹；文章和图片会直接写入这个项目")
      .addText((text) => text
        .setPlaceholder("点击右侧按钮选择文件夹")
        .setValue(this.plugin.settings.jekyllRootPath)
        .onChange(async (value) => {
          this.plugin.settings.jekyllRootPath = value.trim();
          await this.plugin.saveSettings();
        }))
      .addButton((button) => button
        .setButtonText("选择文件夹")
        .setCta()
        .onClick(async () => {
          try {
            const selected = await selectDirectory(this.plugin.settings.jekyllRootPath);
            if (!selected) return;
            this.plugin.settings.jekyllRootPath = selected;
            await this.plugin.saveSettings();
            this.display();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`选择文件夹失败：${message}`, 8000);
          }
        }));

    new Setting(containerEl)
      .setName("Posts 子目录")
      .addText((text) => text
        .setValue(this.plugin.settings.jekyllPostsFolder)
        .onChange(async (value) => {
          this.plugin.settings.jekyllPostsFolder = value.trim() || "_posts";
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("资源子目录")
      .addText((text) => text
        .setValue(this.plugin.settings.jekyllAssetsFolder)
        .onChange(async (value) => {
          this.plugin.settings.jekyllAssetsFolder = value.trim() || "assets/posts";
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Excalidraw PNG 倍率")
      .setDesc("公众号建议使用 2 倍图")
      .addDropdown((dropdown) => dropdown
        .addOptions({ "1": "1×", "2": "2×", "3": "3×" })
        .setValue(String(this.plugin.settings.pngScale))
        .onChange(async (value) => {
          this.plugin.settings.pngScale = Number(value);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("图片使用白色背景")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.imageBackground)
        .onChange(async (value) => {
          this.plugin.settings.imageBackground = value;
          await this.plugin.saveSettings();
        }));
  }
}

interface ElectronDialogResult {
  canceled: boolean;
  filePaths: string[];
}

async function selectDirectory(currentPath: string): Promise<string | null> {
  const desktopWindow = window as typeof window & {
    require?: (module: string) => {
      remote?: {
        dialog?: {
          showOpenDialog(options: {
            title: string;
            defaultPath?: string;
            properties: string[];
          }): Promise<ElectronDialogResult>;
        };
      };
    };
  };
  const dialog = desktopWindow.require?.("electron").remote?.dialog;
  if (!dialog) throw new Error("当前 Obsidian 环境无法打开系统文件夹选择器");

  const result = await dialog.showOpenDialog({
    title: "选择 Jekyll 项目目录",
    ...(currentPath ? { defaultPath: currentPath } : {}),
    properties: ["openDirectory", "createDirectory"]
  });
  return result.canceled ? null : result.filePaths[0] ?? null;
}
