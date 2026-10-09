export interface ExcalidrawEmbed {
  raw: string;
  drawingPath: string;
  frameName?: string;
  width?: string;
  height?: string;
}

export interface RenderedFrame {
  dataUrl: string;
  bytes: ArrayBuffer;
  mimeType: "image/png";
  width?: string;
  alt: string;
}

export interface PublisherSettings {
  jekyllRootPath: string;
  jekyllPostsFolder: string;
  jekyllAssetsFolder: string;
  pngScale: number;
  imageBackground: boolean;
}
