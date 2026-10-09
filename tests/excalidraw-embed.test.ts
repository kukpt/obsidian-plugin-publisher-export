import assert from "node:assert/strict";
import test from "node:test";
import {
  findExcalidrawEmbeds,
  parseExcalidrawEmbed,
  replaceExcalidrawEmbeds
} from "../src/parser/excalidraw-embed";

test("parses frame name and percentage width", () => {
  assert.deepEqual(
    parseExcalidrawEmbed("![[设备接入.excalidraw#^frame=协议|50%]]"),
    {
      raw: "![[设备接入.excalidraw#^frame=协议|50%]]",
      drawingPath: "设备接入.excalidraw",
      frameName: "协议",
      width: "50%"
    }
  );
});

test("supports markdown excalidraw files and pixel dimensions", () => {
  assert.deepEqual(
    parseExcalidrawEmbed("![[diagrams/iot.excalidraw.md|640x360]]"),
    {
      raw: "![[diagrams/iot.excalidraw.md|640x360]]",
      drawingPath: "diagrams/iot.excalidraw.md",
      width: "640px",
      height: "360px"
    }
  );
});

test("ignores embeds inside fenced code", () => {
  const markdown = "before\n```md\n![[ignored.excalidraw|80%]]\n```\n![[used.excalidraw|50%]]\n";
  assert.equal(findExcalidrawEmbeds(markdown).length, 1);
});

test("replaces multiple embeds without leaving size aliases", async () => {
  const markdown = "A\n![[one.excalidraw#^frame=x|80%]]\nB\n![[two.excalidraw|50%]]";
  const output = await replaceExcalidrawEmbeds(markdown, async (embed) => `[${embed.width}]`);
  assert.equal(output, "A\n[80%]\nB\n[50%]");
});
