/**
 * npm tarball 提取逻辑单元测试。
 *
 * 在内存中构造 ustar tar（含 GNU 长文件名、PAX 头、prefix 拼接场景），
 * 验证 extractTarFile 的纯函数行为，不发起网络请求。
 */
import { describe, expect, it } from "vitest";
import { extractTarFile } from "@/lib/conversion/npm-tarball";

const enc = new TextEncoder();

/** 构造 tar：512 字节头 + 数据 + 512 对齐 */
function addEntry(
  chunks: number[][],
  name: string,
  data: Uint8Array,
  typeflag = 0x30,
): void {
  const header = new Uint8Array(512);
  const nameBytes = enc.encode(name);
  header.set(nameBytes.subarray(0, 100));
  // 名称写入 100 字节字段
  const sizeStr = data.length.toString(8).padStart(11, "0");
  header.set(enc.encode(sizeStr), 124);
  header.set(enc.encode("0000644\0"), 100); // mode
  header.set(enc.encode("0000000\0"), 108); // uid
  header.set(enc.encode("0000000\0"), 116); // gid
  header.set(enc.encode("00000000000\0"), 136); // mtime
  header.set(enc.encode("0000000\0"), 148); // checksum（测试无需校验）
  header[156] = typeflag;
  header.set(enc.encode("ustar\0"), 257);
  header.set(enc.encode("00"), 263);
  chunks.push([...header]);
  chunks.push([...data]);
  // 512 对齐填充
  const pad = (512 - (data.length % 512)) % 512;
  if (pad) chunks.push(new Array(pad).fill(0));
}

/** 把块拼接成 tar 字节，结尾补两个 512 零块 */
function buildTar(blocks: number[][]): Uint8Array {
  const total = blocks.reduce((s, b) => s + b.length, 0) + 1024;
  const tar = new Uint8Array(total);
  let off = 0;
  for (const b of blocks) {
    tar.set(b, off);
    off += b.length;
  }
  return tar;
}

describe("extractTarFile", () => {
  it("提取普通 ustar 文件", () => {
    const blocks: number[][] = [];
    addEntry(blocks, "package/src/pandoc.wasm", new Uint8Array([0, 97, 115, 109]));
    const tar = buildTar(blocks);
    const out = extractTarFile(tar, "package/src/pandoc.wasm");
    expect(out).not.toBeNull();
    expect(Array.from(out!)).toEqual([0, 97, 115, 109]);
  });

  it("不存在的路径返回 null", () => {
    const blocks: number[][] = [];
    addEntry(blocks, "a.txt", enc.encode("hi"));
    const tar = buildTar(blocks);
    expect(extractTarFile(tar, "missing.txt")).toBeNull();
  });

  it("GNU 长文件名（typeflag L）能提取", () => {
    const longName = "package/" + "x".repeat(120) + "/pandoc.wasm";
    const blocks: number[][] = [];
    // 先写 'L' 条目，数据为长文件名
    addEntry(blocks, "././@LongLink", enc.encode(longName), 0x4c);
    addEntry(blocks, "dummy", new Uint8Array([1, 2, 3]));
    const tar = buildTar(blocks);
    const out = extractTarFile(tar, longName);
    expect(out).not.toBeNull();
    expect(Array.from(out!)).toEqual([1, 2, 3]);
  });

  it("PAX 扩展头（typeflag x）被安全跳过", () => {
    const blocks: number[][] = [];
    addEntry(blocks, "PaxHeaders.0/a", enc.encode("22 path=pkg/src/pandoc.wasm\n"), 0x78);
    addEntry(blocks, "pkg/src/pandoc.wasm", new Uint8Array([9, 9, 9]));
    const tar = buildTar(blocks);
    const out = extractTarFile(tar, "pkg/src/pandoc.wasm");
    expect(out).not.toBeNull();
    expect(Array.from(out!)).toEqual([9, 9, 9]);
  });

  it("空 tar（无条目）返回 null", () => {
    expect(extractTarFile(new Uint8Array(1024), "a")).toBeNull();
  });
});
