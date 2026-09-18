/**
 * 从 npm 包的 tarball（.tgz = gzip 压缩的 tar）中按路径提取文件。
 *
 * 背景：npmmirror 的「直接文件」端点（registry.npmmirror.com/<pkg>/<ver>/files/…）
 * 有包名白名单（pandoc-wasm 不在名单内，返回 FORBIDDEN）；而 tarball 下载是
 * npm 镜像的核心功能、不受白名单限制，因此走
 * tgz 下载 → gzip 解压 → tar 解析 的路径拿到包内文件。
 *
 * 该模块纯函数 extractTarFile 可在 Node / 浏览器通用，便于单测。
 */
import { WasmUnavailableError } from "./wasm";

const TEXT_DECODER = new TextDecoder();

/** tar 头部以 8 进制 ASCII 存大小，带 NUL/空格填充 */
function parseOctal(bytes: Uint8Array): number {
  const raw = TEXT_DECODER.decode(bytes).replace(/\0.*$/s, "").trim();
  if (!raw) return 0;
  return parseInt(raw, 8) || 0;
}

/** tar 头部名称字段：NUL 填充 */
function decodeName(bytes: Uint8Array): string {
  return TEXT_DECODER.decode(bytes).replace(/\0.*$/s, "");
}

/** tar 结尾的两个全零 512 字节块 */
function isZeroBlock(bytes: Uint8Array): boolean {
  for (const byte of bytes) if (byte !== 0) return false;
  return true;
}

/**
 * 纯函数：从 tar 字节中按路径提取文件。
 * 支持：ustar 普通文件（typeflag '0'/\0）、GNU 长文件名（'L'）、
 * PAX 扩展头（'x'/'g'，跳过其数据段）、prefix 字段拼接。
 * @param tarBytes 解压后的 tar 字节
 * @param targetPath 目标路径（如 "package/src/pandoc.wasm"）
 * @returns 文件字节；不存在返回 null
 */
export function extractTarFile(
  tarBytes: Uint8Array,
  targetPath: string,
): Uint8Array | null {
  let offset = 0;
  let pendingLongName: string | null = null;
  while (offset + 512 <= tarBytes.length) {
    const header = tarBytes.subarray(offset, offset + 512);
    if (isZeroBlock(header)) break;
    const size = parseOctal(header.subarray(124, 136));
    const typeflag = header[156];
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    // 截断保护：数据越界直接放弃
    if (dataEnd > tarBytes.length) break;
    if (typeflag === 0x4c /* 'L' */) {
      // GNU 长文件名：下一个条目使用该名称
      pendingLongName = decodeName(tarBytes.subarray(dataStart, dataEnd));
    } else if (typeflag === 0x78 || typeflag === 0x67) {
      // PAX 扩展头（'x' 文件 / 'g' 全局）：本项目 tarball 无此类型，仅安全跳过
    } else {
      let name = decodeName(header.subarray(0, 100));
      if (pendingLongName) {
        name = pendingLongName;
        pendingLongName = null;
      } else {
        const prefix = decodeName(header.subarray(345, 500));
        if (prefix) name = `${prefix}/${name}`;
      }
      if ((typeflag === 0x30 || typeflag === 0x00) && name === targetPath) {
        return new Uint8Array(tarBytes.subarray(dataStart, dataEnd));
      }
    }
    // 每个条目按 512 字节块对齐
    offset = dataEnd + ((512 - (size % 512)) % 512);
  }
  return null;
}

/**
 * 从 npmmirror 下载 tarball 并解压出目标文件。
 * 失败（网络 / CORS / 不支持流式解压 / 提取不到文件）统一抛 WasmUnavailableError。
 */
export async function fetchFileFromTarball(
  tarballUrl: string,
  filePath: string,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(tarballUrl);
  } catch {
    throw new WasmUnavailableError();
  }
  if (!response.ok) throw new WasmUnavailableError();
  if (!response.body || typeof DecompressionStream === "undefined") {
    throw new WasmUnavailableError(
      "WASM 转换引擎不可用：当前浏览器不支持流式解压",
    );
  }
  let tarBytes: Uint8Array;
  try {
    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
    tarBytes = new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    throw new WasmUnavailableError();
  }
  const file = extractTarFile(tarBytes, filePath);
  if (!file) {
    throw new WasmUnavailableError(
      "WASM 转换引擎不可用：下载的包中未找到引擎文件",
    );
  }
  return file;
}
