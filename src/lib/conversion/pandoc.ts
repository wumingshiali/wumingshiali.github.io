/**
 * pandoc-wasm 文档转换（Markdown ↔ DOCX）。
 *
 * 设计：pandoc.wasm 二进制约 58MB，不随站点打包，首次使用时从 npmmirror 下载
 * 并缓存实例；下载 / 初始化失败时抛 WasmUnavailableError，页面展示「WASM 不可用」提示。
 *
 * CDN 选型（已逐家实测）：
 * - jsDelivr / jsdmirror（npm 镜像）：单文件上限 50MB，pandoc.wasm 58MB 被 403
 * - esm.run：只是 jsDelivr `/+esm` 的 JS 模块转换代理，不提供二进制文件
 * - zstatic.net：npm 镜像按 Content-Type 白名单过滤，不含 application/wasm → 451
 * - npmmirror 直链：pandoc-wasm 已加入官方 unpkg 白名单，为主路径
 * - 回退：白名单未同步到节点时走 tarball 提取（tarball 不受白名单限制）
 */
import { createPandocInstance, type PandocInstance } from "pandoc-wasm/core";
import { fetchFileFromTarball } from "./npm-tarball";
import { WasmUnavailableError } from "./wasm";
/** npmmirror 直链：pandoc-wasm 已加入官方 unpkg 白名单（主路径） */
const PANDOC_WASM_URL =
  "https://registry.npmmirror.com/pandoc-wasm/1.1.0/files/src/pandoc.wasm";
/** 回退路径：npmmirror tarball（不受白名单限制） */
const PANDOC_TARBALL_URL =
  "https://registry.npmmirror.com/pandoc-wasm/-/pandoc-wasm-1.1.0.tgz";
const PANDOC_WASM_PATH = "package/src/pandoc.wasm";

let instancePromise: Promise<PandocInstance> | null = null;

/** 加载 pandoc 实例（单例缓存；失败后允许重试） */
export async function loadPandoc(): Promise<PandocInstance> {
  instancePromise ??= loadPandocBinary();
  try {
    return await instancePromise;
  } catch (err) {
    instancePromise = null;
    throw err;
  }
}

/** 获取 pandoc.wasm：直链优先，失败自动回退 tarball 提取 */
async function fetchPandocWasm(): Promise<Uint8Array> {
  try {
    const response = await fetch(PANDOC_WASM_URL);
    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }
  } catch {
    // 网络异常：继续走回退
  }
  return fetchFileFromTarball(PANDOC_TARBALL_URL, PANDOC_WASM_PATH);
}

async function loadPandocBinary(): Promise<PandocInstance> {
  const wasmBytes = await fetchPandocWasm();
  try {
    return await createPandocInstance(wasmBytes);
  } catch {
    throw new WasmUnavailableError(
      "WASM 转换引擎不可用：当前浏览器无法初始化 pandoc，请更换浏览器后重试",
    );
  }
}
/** Markdown → DOCX，返回生成的 .docx 文件 */
export async function markdownToDocx(
  markdown: string,
  outputName = "output.docx",
): Promise<Blob> {
  const pandoc = await loadPandoc();
  const result = await pandoc.convert(
    { from: "markdown", to: "docx", standalone: true, "output-file": outputName },
    markdown,
    {},
  );
  const output = result.files[outputName];
  if (!(output instanceof Blob)) {
    throw new Error("转换失败：未生成 DOCX 文件");
  }
  return output;
}

/** DOCX → Markdown：提取内嵌图片并转成 data URL，输出自包含的 md 文本 */
export async function docxToMarkdown(
  file: Blob,
): Promise<{ markdown: string; media: Record<string, Blob> }> {
  const pandoc = await loadPandoc();
  const result = await pandoc.convert(
    {
      from: "docx",
      to: "markdown",
      standalone: true,
      wrap: "none",
      "extract-media": "media",
    },
    null,
    // 二进制输入挂到 stdin 键：pandoc-wasm 对「具名二进制文件」的 WASI 读取存在 bug
    // （见 pandoc/pandoc-wasm#4），官方 workaround 是走 stdin
    { stdin: file },
  );
  let markdown = result.stdout;
  // 把 md 里引用的媒体路径替换为 data URL：先替换长路径，避免短路径误伤
  const mediaEntries = Object.entries(result.mediaFiles).sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [path, blob] of mediaEntries) {
    if (!markdown.includes(path)) continue;
    const dataUrl = await blobToDataUrl(blob, path);
    markdown = markdown.split(path).join(dataUrl);
  }
  return { markdown, media: result.mediaFiles };
}

/** 按扩展名推断 MIME，生成 data URL */
async function blobToDataUrl(blob: Blob, name: string): Promise<string> {
  const mime = blob.type || guessMimeFromName(name);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${mime};base64,${btoa(binary)}`;
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function guessMimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
