/**
 * pandoc-wasm 转换核心回归测试。
 *
 * 直接读取本地 node_modules 中的 pandoc.wasm（与浏览器 CDN 同一个二进制），
 * 验证：
 * - md → docx 生成合法 zip（PK 头）
 * - docx → md 必须走 stdin 键（pandoc/pandoc-wasm#4 的 workaround：
 *   具名二进制文件在 WASI 下读取会报 "not enough bytes"）
 * - 内嵌图片经 --extract-media 提取，md 引用与 mediaFiles 键一致
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createPandocInstance, type PandocInstance } from "pandoc-wasm/core";

let pandoc: PandocInstance;

beforeAll(async () => {
  const wasmPath = resolve(
    process.cwd(),
    "node_modules/pandoc-wasm/src/pandoc.wasm",
  );
  const binary = readFileSync(wasmPath);
  pandoc = await createPandocInstance(
    binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
  );
}, 30_000);

// 1×1 红色 PNG
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("pandoc-wasm 文档转换", () => {
  it("md → docx 生成合法 DOCX（zip PK 头）", async () => {
    const result = await pandoc.convert(
      { from: "markdown", to: "docx", standalone: true, "output-file": "out.docx" },
      "# 标题\n\n正文 **加粗** 喵～",
      {},
    );
    const output = result.files["out.docx"];
    expect(output).toBeInstanceOf(Blob);
    const bytes = new Uint8Array(await (output as Blob).arrayBuffer());
    // zip 魔数 PK\x03\x04
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(result.stderr).toBe("");
  });

  it("docx → md：具名文件读取失败，stdin 键可正常转换", async () => {
    const docx = await pandoc.convert(
      { from: "markdown", to: "docx", standalone: true, "output-file": "out.docx" },
      "# 你好\n\n- a\n- b",
      {},
    );
    const blob = docx.files["out.docx"] as Blob;

    // 具名文件路径在 WASI 下读不出内容（回归保护 #4）
    const named = await pandoc.convert(
      { from: "docx", to: "markdown", wrap: "none" },
      null,
      { "input.docx": blob },
    );
    expect(named.stderr).toContain("not enough bytes");

    // stdin 键 workaround：正常转回 markdown
    const viaStdin = await pandoc.convert(
      { from: "docx", to: "markdown", wrap: "none" },
      null,
      { stdin: blob },
    );
    expect(viaStdin.stderr).toBe("");
    expect(viaStdin.stdout).toContain("# 你好");
  });

  it("docx → md：内嵌图片提取后 md 引用与 mediaFiles 键一致", async () => {
    const markdown = `# 带图\n\n![图](data:image/png;base64,${PNG_BASE64})\n\n文字`;
    const docx = await pandoc.convert(
      { from: "markdown", to: "docx", standalone: true, "output-file": "out.docx" },
      markdown,
      {},
    );
    const result = await pandoc.convert(
      {
        from: "docx",
        to: "markdown",
        standalone: true,
        wrap: "none",
        "extract-media": "media",
      },
      null,
      { stdin: docx.files["out.docx"] as Blob },
    );
    const mediaKeys = Object.keys(result.mediaFiles);
    expect(mediaKeys.length).toBeGreaterThan(0);
    // md 中必须引用至少一个提取出的媒体路径（供 data URL 替换）
    const referenced = mediaKeys.some((key) => result.stdout.includes(key));
    expect(referenced).toBe(true);
  });
});
