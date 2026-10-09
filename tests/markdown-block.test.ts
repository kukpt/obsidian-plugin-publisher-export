import assert from "node:assert/strict";
import test from "node:test";
import { wrapMarkdownBlock } from "../src/parser/markdown-block";

test("separates raw HTML from adjacent Markdown", () => {
  assert.equal(
    `before\n${wrapMarkdownBlock("<p><img src=\"x\"></p>")}> **bold**`,
    "before\n\n\n<p><img src=\"x\"></p>\n\n> **bold**"
  );
});
