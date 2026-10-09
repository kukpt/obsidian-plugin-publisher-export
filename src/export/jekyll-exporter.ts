import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { App, TFile } from "obsidian";
import { replaceExcalidrawEmbeds } from "../parser/excalidraw-embed";
import { normalizeImportedMarkdown } from "../parser/imported-markdown";
import { wrapMarkdownBlock } from "../parser/markdown-block";
import type { PublisherSettings } from "../types";
import { ExcalidrawFrameExporter } from "../excalidraw/frame-exporter";

export interface JekyllExportResult {
  postPath: string;
  assetCount: number;
}

export class JekyllExporter {
  constructor(
    private readonly app: App,
    private readonly settings: PublisherSettings,
    private readonly frameExporter: ExcalidrawFrameExporter
  ) {}

  async export(file: TFile, markdown: string): Promise<JekyllExportResult> {
    const rootPath = validateRootPath(this.settings.jekyllRootPath);
    const slug = slugify(file.basename);
    const assetRelative = toSitePath(`${this.settings.jekyllAssetsFolder}/${slug}`);
    const assetFolder = safeJoin(rootPath, assetRelative);
    await mkdir(assetFolder, { recursive: true });

    let assetCount = 0;
    const normalized = normalizeImportedMarkdown(markdown);
    const rendered = await replaceExcalidrawEmbeds(normalized, async (embed, index) => {
      const frame = await this.frameExporter.export(embed, file.path);
      const name = `${String(index + 1).padStart(2, "0")}-${slugify(frame.alt)}.png`;
      const outputPath = join(assetFolder, name);
      await writeFile(outputPath, new Uint8Array(frame.bytes));
      assetCount += 1;
      const sitePath = `/${assetRelative}/${name}`;
      const width = frame.width ? ` style="width:${escapeAttribute(frame.width)};height:auto"` : "";
      return wrapMarkdownBlock(`<img src="{{ '${sitePath}' | relative_url }}" alt="${escapeAttribute(frame.alt)}"${width}>`);
    });

    const postFolder = safeJoin(rootPath, this.settings.jekyllPostsFolder);
    await mkdir(postFolder, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const postPath = join(postFolder, `${date}-${slug}.md`);
    const output = hasFrontMatter(rendered)
      ? rendered
      : `---\nlayout: post\ntitle: "${file.basename.replaceAll('"', '\\"')}"\ndate: ${date}\n---\n\n${rendered}`;
    await writeFile(postPath, output, "utf8");
    return { postPath, assetCount };
  }
}

function hasFrontMatter(markdown: string): boolean {
  return /^---\s*\n/.test(markdown);
}

function slugify(value: string): string {
  const result = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|#%{}]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return result || "post";
}

function validateRootPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) throw new Error("请先在插件设置中选择 Jekyll 项目目录");
  if (!isAbsolute(trimmed)) throw new Error("Jekyll 项目目录必须是绝对路径");
  return resolve(trimmed);
}

function safeJoin(root: string, child: string): string {
  const output = resolve(root, child);
  const pathFromRoot = relative(root, output);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
    throw new Error(`导出子目录不能超出 Jekyll 项目：${child}`);
  }
  return output;
}

function toSitePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
