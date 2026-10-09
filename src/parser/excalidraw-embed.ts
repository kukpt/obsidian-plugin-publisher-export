import type { ExcalidrawEmbed } from "../types";

const EMBED_PATTERN = /!\[\[([^\]\n]+)\]\]/g;

export function parseExcalidrawEmbed(raw: string): ExcalidrawEmbed | null {
  if (!raw.startsWith("![[") || !raw.endsWith("]]")) return null;

  const inner = raw.slice(3, -2);
  const [targetWithFrame, ...aliases] = inner.split("|");
  if (!targetWithFrame) return null;

  const frameMarker = "#^frame=";
  const frameIndex = targetWithFrame.indexOf(frameMarker);
  const drawingPath = (frameIndex >= 0
    ? targetWithFrame.slice(0, frameIndex)
    : targetWithFrame
  ).trim();

  if (!/\.excalidraw(?:\.md)?$/i.test(drawingPath)) return null;

  const frameName = frameIndex >= 0
    ? decodeURIComponent(targetWithFrame.slice(frameIndex + frameMarker.length).trim())
    : undefined;
  const size = parseSize(aliases);

  return {
    raw,
    drawingPath,
    ...(frameName ? { frameName } : {}),
    ...size
  };
}

function parseSize(aliases: string[]): Pick<ExcalidrawEmbed, "width" | "height"> {
  for (const alias of aliases) {
    const value = alias.trim();
    const dimensions = /^(\d+(?:\.\d+)?%?)(?:x(\d+(?:\.\d+)?%?))?$/.exec(value);
    if (!dimensions?.[1]) continue;
    return {
      width: normalizeSize(dimensions[1]),
      ...(dimensions[2] ? { height: normalizeSize(dimensions[2]) } : {})
    };
  }
  return {};
}

function normalizeSize(value: string): string {
  return value.endsWith("%") ? value : `${value}px`;
}

export interface EmbedOccurrence {
  start: number;
  end: number;
  embed: ExcalidrawEmbed;
}

export function findExcalidrawEmbeds(markdown: string): EmbedOccurrence[] {
  const occurrences: EmbedOccurrence[] = [];
  let inFence = false;
  let offset = 0;

  for (const line of markdown.split(/(?<=\n)/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      offset += line.length;
      continue;
    }

    if (!inFence) {
      EMBED_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = EMBED_PATTERN.exec(line)) !== null) {
        const parsed = parseExcalidrawEmbed(match[0]);
        if (parsed) {
          occurrences.push({
            start: offset + match.index,
            end: offset + match.index + match[0].length,
            embed: parsed
          });
        }
      }
    }
    offset += line.length;
  }

  return occurrences;
}

export async function replaceExcalidrawEmbeds(
  markdown: string,
  replacer: (embed: ExcalidrawEmbed, index: number) => Promise<string>
): Promise<string> {
  const occurrences = findExcalidrawEmbeds(markdown);
  if (occurrences.length === 0) return markdown;

  const replacements = await Promise.all(
    occurrences.map((item, index) => replacer(item.embed, index))
  );
  let result = "";
  let cursor = 0;
  occurrences.forEach((item, index) => {
    result += markdown.slice(cursor, item.start);
    result += replacements[index] ?? "";
    cursor = item.end;
  });
  return result + markdown.slice(cursor);
}
