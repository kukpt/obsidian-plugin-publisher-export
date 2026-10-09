import { Notice, Plugin, TFile } from "obsidian";
import { ExcalidrawFrameExporter } from "./excalidraw/frame-exporter";
import { JekyllExporter } from "./export/jekyll-exporter";
import { WechatExporter } from "./export/wechat-exporter";
import { DEFAULT_SETTINGS, PublisherSettingTab } from "./settings";
import type { PublisherSettings } from "./types";

export default class PublisherExportPlugin extends Plugin {
  override settings: PublisherSettings = DEFAULT_SETTINGS;

  override async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new PublisherSettingTab(this.app, this));

    this.addCommand({
      id: "export-current-note-to-wechat",
      name: "导出当前笔记到微信公众号",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) void this.exportToWechat(file);
        return true;
      }
    });

    this.addCommand({
      id: "export-current-note-to-jekyll",
      name: "导出当前笔记到 Jekyll",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) void this.exportToJekyll(file);
        return true;
      }
    });
  }

  async loadSettings(): Promise<void> {
    const saved = await this.loadData() as (Partial<PublisherSettings> & {
      jekyllExportFolder?: string;
    }) | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    // Versions before 0.2 stored a Vault-relative export folder. It cannot be
    // safely interpreted as an arbitrary system location, so the user chooses
    // the real Jekyll root once after upgrading.
    if (!saved?.jekyllRootPath) this.settings.jekyllRootPath = "";
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private createFrameExporter(): ExcalidrawFrameExporter {
    return new ExcalidrawFrameExporter(this.app, this.settings);
  }

  private async exportToWechat(file: TFile): Promise<void> {
    try {
      const markdown = await this.app.vault.cachedRead(file);
      const exporter = new WechatExporter(this.app, this.createFrameExporter());
      const html = await exporter.render(file, markdown);
      await exporter.copy(html);
      new Notice("已复制公众号格式，可直接粘贴到公众号编辑器");
    } catch (error) {
      this.showError("公众号导出失败", error);
    }
  }

  private async exportToJekyll(file: TFile): Promise<void> {
    try {
      const markdown = await this.app.vault.cachedRead(file);
      const exporter = new JekyllExporter(this.app, this.settings, this.createFrameExporter());
      const result = await exporter.export(file, markdown);
      new Notice(`Jekyll 导出完成：${result.postPath}（${result.assetCount} 张图）`, 8000);
    } catch (error) {
      this.showError("Jekyll 导出失败", error);
    }
  }

  private showError(prefix: string, error: unknown): void {
    console.error(prefix, error);
    const message = error instanceof Error ? error.message : String(error);
    new Notice(`${prefix}：${message}`, 10000);
  }
}
