import type { TFile } from "obsidian";

export interface ExcalidrawElementLike {
  id: string;
  type: string;
  name?: string;
  frameId?: string | null;
  isDeleted?: boolean;
  [key: string]: unknown;
}

export interface ExcalidrawAutomateLike {
  elementsDict: Record<string, ExcalidrawElementLike>;
  canvas: { theme: string; viewBackgroundColor: string };
  reset(): void;
  getSceneFromFile(file: TFile): Promise<{
    elements: ExcalidrawElementLike[];
    appState?: { theme?: string; viewBackgroundColor?: string };
  }>;
  getElementsInFrame(
    frame: ExcalidrawElementLike,
    elements: ExcalidrawElementLike[],
    includeFrame?: boolean
  ): ExcalidrawElementLike[];
  getExportSettings(withBackground: boolean, withTheme: boolean): unknown;
  getEmbeddedFilesLoader(isDark?: boolean): unknown;
  createPNG(
    templatePath?: string,
    scale?: number,
    exportSettings?: unknown,
    loader?: unknown,
    theme?: string,
    padding?: number
  ): Promise<Blob | ArrayBuffer | string>;
}

export interface ExcalidrawPluginLike {
  ea?: { getAPI(): ExcalidrawAutomateLike };
  getAPI?(): ExcalidrawAutomateLike;
}
