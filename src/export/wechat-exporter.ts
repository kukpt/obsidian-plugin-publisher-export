import { App, Component, MarkdownRenderer, TFile } from "obsidian";
import { replaceExcalidrawEmbeds } from "../parser/excalidraw-embed";
import { normalizeImportedMarkdown } from "../parser/imported-markdown";
import { wrapMarkdownBlock } from "../parser/markdown-block";
import { ExcalidrawFrameExporter } from "../excalidraw/frame-exporter";

export class WechatExporter {
  constructor(
    private readonly app: App,
    private readonly frameExporter: ExcalidrawFrameExporter
  ) {}

  async render(file: TFile, markdown: string): Promise<string> {
    const withFrames = await replaceExcalidrawEmbeds(markdown, async (embed) => {
      const frame = await this.frameExporter.export(embed, file.path);
      const width = frame.width ?? "100%";
      return wrapMarkdownBlock(`<p><img src="${frame.dataUrl}" alt="${escapeAttribute(frame.alt)}" style="width:${escapeAttribute(width)};max-width:100%;height:auto"></p>`);
    });

    const container = document.createElement("section");
    const component = new Component();
    component.load();
    try {
      await MarkdownRenderer.render(
        this.app,
        normalizeImportedMarkdown(withFrames, { quoteBreakStyle: "none" }),
        container,
        file.path,
        component
      );
      applyWechatStyles(container);
      return container.innerHTML;
    } finally {
      component.unload();
    }
  }

  async copy(html: string): Promise<void> {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([stripHtml(html)], { type: "text/plain" })
      });
      await navigator.clipboard.write([item]);
      return;
    }
    await navigator.clipboard.writeText(stripHtml(html));
  }
}

function applyWechatStyles(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(
    ".copy-code-button, button[aria-label='Copy code'], button[aria-label='复制代码']"
  ).forEach((element) => element.remove());

  root.style.cssText = "font-size:16px;line-height:1.8;color:#262626;word-break:break-word";
  root.querySelectorAll<HTMLElement>("h1,h2,h3").forEach((element) => {
    const sizes: Record<string, string> = { H1: "26px", H2: "22px", H3: "18px" };
    element.style.cssText = `font-size:${sizes[element.tagName] ?? "18px"};font-weight:700;margin:1.6em 0 .7em;color:#17233d`;
  });
  root.querySelectorAll<HTMLElement>("p").forEach((element) => {
    element.style.cssText = "margin:0 0 1em;line-height:1.8";
  });
  root.querySelectorAll<HTMLElement>("strong,b").forEach((element) => {
    element.style.fontWeight = "700";
  });
  root.querySelectorAll<HTMLElement>("blockquote").forEach((element) => {
    element.style.cssText = "margin:1em 0;padding:.7em 1em;border-left:4px solid #4c9ffe;background:#f6f8fa;color:#555";
  });
  root.querySelectorAll<HTMLElement>("blockquote p").forEach((element) => {
    element.style.cssText = "margin:0;line-height:1.75";
  });
  root.querySelectorAll<HTMLElement>("pre").forEach((element) => {
    element.style.cssText = "box-sizing:border-box;margin:1.2em 0;padding:16px 18px;overflow-x:auto;border:1px solid #1e293b;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:13px;line-height:1.65;text-align:left;white-space:pre;word-break:normal;box-shadow:0 2px 8px rgba(15,23,42,.12)";
  });
  root.querySelectorAll<HTMLElement>("code").forEach((element) => {
    if (element.parentElement?.tagName === "PRE") {
      element.style.cssText = "display:block;margin:0;padding:0;border:0;background:transparent;color:inherit;font-family:Menlo,Monaco,Consolas,'Courier New',monospace;font-size:13px;line-height:1.65;white-space:pre;word-break:normal;overflow-wrap:normal;tab-size:2";
    } else {
      element.style.cssText = "padding:2px 5px;border-radius:3px;background:#f1f3f5;color:#d6336c;font-size:.9em";
    }
  });
  applyCodeTokenStyles(root);
  root.querySelectorAll<HTMLImageElement>("img").forEach((element) => {
    element.style.maxWidth = "100%";
    element.style.height = "auto";
  });
}

function applyCodeTokenStyles(root: HTMLElement): void {
  const tokenStyles: Array<[string, string]> = [
    [".token.comment,.token.prolog,.token.doctype,.token.cdata", "color:#64748b;font-style:italic"],
    [".token.keyword,.token.atrule", "color:#c084fc;font-weight:600"],
    [".token.string,.token.char,.token.attr-value", "color:#86efac"],
    [".token.number,.token.boolean,.token.constant", "color:#fdba74"],
    [".token.function,.token.method", "color:#7dd3fc"],
    [".token.class-name,.token.builtin", "color:#fde68a"],
    [".token.operator,.token.entity,.token.url", "color:#67e8f9"],
    [".token.punctuation", "color:#cbd5e1"],
    [".token.variable,.token.property,.token.tag", "color:#fda4af"]
  ];

  tokenStyles.forEach(([selector, style]) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.style.cssText = style;
    });
  });
}

function stripHtml(html: string): string {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.textContent ?? "";
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
