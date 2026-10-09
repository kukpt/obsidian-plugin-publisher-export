import { App, TFile } from "obsidian";
import type { ExcalidrawEmbed, PublisherSettings, RenderedFrame } from "../types";
import type {
  ExcalidrawAutomateLike,
  ExcalidrawElementLike,
  ExcalidrawPluginLike
} from "./api-types";

export class ExcalidrawFrameExporter {
  constructor(
    private readonly app: App,
    private readonly settings: PublisherSettings
  ) {}

  async export(embed: ExcalidrawEmbed, sourcePath: string): Promise<RenderedFrame> {
    const file = this.resolveFile(embed.drawingPath, sourcePath);
    const ea = this.getApi();
    ea.reset();

    const scene = await ea.getSceneFromFile(file);
    const liveElements = scene.elements.filter((element) => !element.isDeleted);
    const elements = embed.frameName
      ? this.getFrameElements(ea, liveElements, embed.frameName)
      : liveElements;

    if (elements.length === 0) {
      throw new Error(`图中没有可导出的元素：${embed.drawingPath}`);
    }

    ea.elementsDict = Object.fromEntries(
      elements.map((element) => [element.id, structuredClone(element)])
    );
    ea.canvas.theme = "light";
    ea.canvas.viewBackgroundColor = scene.appState?.viewBackgroundColor ?? "#ffffff";

    const result = await ea.createPNG(
      undefined,
      this.settings.pngScale,
      ea.getExportSettings(this.settings.imageBackground, false),
      ea.getEmbeddedFilesLoader(false),
      "light",
      10
    );
    const bytes = await toArrayBuffer(result);
    const dataUrl = `data:image/png;base64,${arrayBufferToBase64(bytes)}`;

    return {
      dataUrl,
      bytes,
      mimeType: "image/png",
      width: embed.width,
      alt: embed.frameName ?? file.basename
    };
  }

  private resolveFile(linkpath: string, sourcePath: string): TFile {
    const candidates = [linkpath];
    if (linkpath.endsWith(".excalidraw")) {
      candidates.push(`${linkpath}.md`);
    }

    for (const candidate of candidates) {
      const file = this.app.metadataCache.getFirstLinkpathDest(candidate, sourcePath);
      if (file) return file;
    }
    throw new Error(`找不到 Excalidraw 文件：${linkpath}`);
  }

  private getApi(): ExcalidrawAutomateLike {
    const globalAutomate = (window as typeof window & {
      ExcalidrawAutomate?: { getAPI(): ExcalidrawAutomateLike };
    }).ExcalidrawAutomate;
    const internalApp = this.app as App & {
      plugins?: { getPlugin(id: string): ExcalidrawPluginLike | null };
    };
    const plugin = internalApp.plugins?.getPlugin("obsidian-excalidraw-plugin");
    const api = globalAutomate?.getAPI() ?? plugin?.ea?.getAPI() ?? plugin?.getAPI?.();
    if (!api) {
      throw new Error("请先安装并启用 Excalidraw 插件");
    }
    return api;
  }

  private getFrameElements(
    ea: ExcalidrawAutomateLike,
    elements: ExcalidrawElementLike[],
    frameName: string
  ): ExcalidrawElementLike[] {
    const frame = elements.find(
      (element) => element.type === "frame" &&
        (element.name === frameName || element.id === frameName)
    );
    if (!frame) {
      throw new Error(`找不到 Excalidraw Frame：${frameName}`);
    }

    // Keeping the frame gives Excalidraw the exact crop rectangle. Frame borders
    // are omitted by Excalidraw's image exporter.
    return ea.getElementsInFrame(frame, elements, true);
  }
}

async function toArrayBuffer(value: Blob | ArrayBuffer | string): Promise<ArrayBuffer> {
  if (value instanceof ArrayBuffer) return value;
  if (value instanceof Blob) return value.arrayBuffer();

  const base64 = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
