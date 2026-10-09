import assert from "node:assert/strict";
import test from "node:test";
import { normalizeImportedMarkdown } from "../src/parser/imported-markdown";

test("repairs escaped bold markers and HTML spaces", () => {
  const source = "我把\\*\\*MQTT\\*\\*、&#x20;\\*\\*HTTP\\*\\*放到\\*\\*网络\\*\\*里。";
  assert.equal(normalizeImportedMarkdown(source), "我把**MQTT**、 **HTTP**放到**网络**里。");
});

test("restores an H2 pasted onto the end of a paragraph", () => {
  const source = "还有复杂的维护、调试、运维等工程问题）  ## 设备是怎么产生数据的？";
  assert.equal(
    normalizeImportedMarkdown(source),
    "还有复杂的维护、调试、运维等工程问题）\n\n## 设备是怎么产生数据的？"
  );
});

test("keeps fenced and inline code unchanged", () => {
  const source = "`\\*\\*literal\\*\\*`\n```md\n\\*\\*literal\\*\\*&#x20;\n```";
  assert.equal(normalizeImportedMarkdown(source), source);
});

test("turns imported trailing backslashes into hard breaks", () => {
  assert.equal(normalizeImportedMarkdown("第一行\\\n&#x20;第二行"), "第一行  \n 第二行");
});

test("preserves paragraph breaks used by Jekyll", () => {
  const source = "第一段。\\\n&#x20;同段换行。\n\n## 第二段";
  assert.equal(
    normalizeImportedMarkdown(source),
    "第一段。  \n 同段换行。\n\n## 第二段"
  );
});

test("repairs imported blockquotes and preserves each visible line", () => {
  const source = [
    "\\> 我们看到的 **\\*\\*23.41m\\*\\*** 是传感器&#x5C06;**\\*\\*物理量\\*\\***",
    "\\> 之后通过 **\\*\\*ADC\\*\\*** 模块将其转换&#x4E3A;**\\*\\*数字量 23.41m\\*\\***",
    "\\> 最后一行"
  ].join("\n");

  assert.equal(
    normalizeImportedMarkdown(source),
    [
      "> 我们看到的 **23.41m** 是传感器将**物理量**<br>",
      "> 之后通过 **ADC** 模块将其转换为**数字量 23.41m**<br>",
      "> 最后一行"
    ].join("\n")
  );
});

test("does not decode entities inside code", () => {
  const source = "`&#x5C06;`\n```html\n&#x5C06;\n```";
  assert.equal(normalizeImportedMarkdown(source), source);
});

test("uses explicit HTML breaks for consecutive quote lines", () => {
  assert.equal(
    normalizeImportedMarkdown("> 第一行\\\n> 第二行"),
    "> 第一行<br>\n> 第二行"
  );
});

test("uses one Markdown hard break for WeChat quote lines", () => {
  assert.equal(
    normalizeImportedMarkdown("> 第一行\n> 第二行", { quoteBreakStyle: "markdown" }),
    "> 第一行  \n> 第二行"
  );
});

test("can preserve original quote newlines without hard breaks", () => {
  assert.equal(
    normalizeImportedMarkdown("> 第一行\n> 第二行", { quoteBreakStyle: "none" }),
    "> 第一行\n> 第二行"
  );
});

test("closes a single unmatched strong marker on an imported line", () => {
  assert.equal(
    normalizeImportedMarkdown("> **到这里，我们还没有真正接入设备"),
    "> **到这里，我们还没有真正接入设备**"
  );
});
