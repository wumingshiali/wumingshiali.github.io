/**
 * 单向加密（哈希 / 带盐派生）工具。
 *
 * 算法分三类：
 * - 基础散列：MD5（纯 JS 实现，RFC 1321）/ SHA-1 / SHA-256 / SHA-384 / SHA-512（WebCrypto）
 * - 密钥散列：HMAC-SHA256 / HMAC-SHA512（WebCrypto，密钥即"盐"）
 * - 带盐密码派生：PBKDF2-HMAC-SHA256（WebCrypto）/ scrypt（@noble/hashes 纯 JS，
 *   浏览器 WebCrypto 尚未实现 scrypt）
 */
import { bytesToHex, textToBytes } from "./utils";
import { scryptAsync } from "@noble/hashes/scrypt.js";

export type HashAlgorithm =
  | "MD5"
  | "SHA-1"
  | "SHA-256"
  | "SHA-384"
  | "SHA-512"
  | "HMAC-SHA256"
  | "HMAC-SHA512"
  | "PBKDF2-SHA256"
  | "SCRYPT";

export interface HashAlgoMeta {
  id: HashAlgorithm;
  label: string;
  /** 安全提示，空串表示推荐 */
  note: string;
  /** HMAC：需要密钥 */
  needsKey?: boolean;
  /** PBKDF2 / scrypt：需要密码 */
  needsPassword?: boolean;
  /** PBKDF2 / scrypt：需要盐值 */
  needsSalt?: boolean;
  /** PBKDF2：需要迭代次数 */
  needsIterations?: boolean;
  /** scrypt：需要 N / r / p 参数 */
  needsScryptParams?: boolean;
}

export const hashAlgorithms: HashAlgoMeta[] = [
  { id: "MD5", label: "MD5（128 位）", note: "已被攻破，仅作兼容" },
  { id: "SHA-1", label: "SHA-1（160 位）", note: "已不推荐，仅作兼容" },
  { id: "SHA-256", label: "SHA-256（256 位）", note: "" },
  { id: "SHA-384", label: "SHA-384（384 位）", note: "" },
  { id: "SHA-512", label: "SHA-512（512 位）", note: "" },
  { id: "HMAC-SHA256", label: "HMAC-SHA256（密钥散列）", note: "密钥即盐，可用于消息校验", needsKey: true },
  { id: "HMAC-SHA512", label: "HMAC-SHA512（密钥散列）", note: "密钥即盐，可用于消息校验", needsKey: true },
  {
    id: "PBKDF2-SHA256",
    label: "PBKDF2-SHA256（加盐派生）",
    note: "密码拉伸，抗彩虹表",
    needsPassword: true,
    needsSalt: true,
    needsIterations: true,
  },
  { id: "SCRYPT", label: "scrypt（加盐派生）", note: "内存困难型，更抗暴力破解", needsPassword: true, needsSalt: true, needsScryptParams: true },
];

/** 带盐 / 密钥算法的附加输入 */
export interface HashOptions {
  /** HMAC 密钥；PBKDF2 / scrypt 的密码 */
  secret?: string;
  /** 盐值（PBKDF2 / scrypt），UTF-8 编码 */
  salt?: string;
  /** PBKDF2 迭代次数 */
  iterations?: number;
  /** scrypt 内存成本 N（2 的幂） */
  scryptN?: number;
  /** scrypt 块大小 r */
  scryptR?: number;
  /** scrypt 并行度 p */
  scryptP?: number;
  /** 派生密钥字节数（PBKDF2 / scrypt），默认 32 */
  outputBytes?: number;
}

/** 获取算法元数据，未知算法抛错 */
export function getHashAlgoMeta(algo: HashAlgorithm): HashAlgoMeta {
  const meta = hashAlgorithms.find((a) => a.id === algo);
  if (!meta) throw new Error(`未知的哈希算法：${algo}`);
  return meta;
}

/**
 * 计算单向结果并返回小写十六进制。
 * 基础散列 / HMAC 对原文 text 计算；PBKDF2 / scrypt 用 text（密码）+ salt 派生密钥。
 */
export async function hashText(
  algorithm: HashAlgorithm,
  text: string,
  options: HashOptions = {},
): Promise<string> {
  const meta = getHashAlgoMeta(algorithm);
  if (meta.needsPassword) {
    if (algorithm === "SCRYPT") {
      return bytesToHex(await scryptDerive(text, options));
    }
    return bytesToHex(await pbkdf2Derive(text, options));
  }
  return bytesToHex(await digestOrHmac(algorithm, textToBytes(text), options.secret));
}

/**
 * 对文件 / 任意字节计算单向结果（支持散列与 HMAC）。
 * 密码派生算法（PBKDF2 / scrypt）面向密码文本，不适用于文件，直接抛错。
 */
export async function hashBytes(
  algorithm: HashAlgorithm,
  bytes: Uint8Array<ArrayBuffer>,
  options: HashOptions = {},
): Promise<string> {
  if (getHashAlgoMeta(algorithm).needsPassword) {
    throw new Error("密码派生算法不适用于文件，请切换回文本模式");
  }
  return bytesToHex(await digestOrHmac(algorithm, bytes, options.secret));
}

/** 散列 / HMAC 共用：对任意字节计算（HMAC 密钥来自 options.secret） */
async function digestOrHmac(
  algorithm: HashAlgorithm,
  bytes: Uint8Array<ArrayBuffer>,
  secret?: string,
): Promise<Uint8Array> {
  if (algorithm === "HMAC-SHA256" || algorithm === "HMAC-SHA512") {
    return hmacDigest(algorithm, secret ?? "", bytes);
  }
  if (algorithm === "MD5") return md5(bytes);
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return new Uint8Array(digest);
}

/** HMAC：密钥导入后对字节签名，输出与散列等长的认证码 */
async function hmacDigest(
  algorithm: "HMAC-SHA256" | "HMAC-SHA512",
  secret: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array> {
  const hash = algorithm === "HMAC-SHA256" ? "SHA-256" : "SHA-512";
  const key = await crypto.subtle.importKey(
    "raw",
    textToBytes(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  const tag = await crypto.subtle.sign("HMAC", key, bytes);
  return new Uint8Array(tag);
}

/** PBKDF2-HMAC-SHA256：密码 + 盐 + 迭代次数派生密钥 */
async function pbkdf2Derive(
  password: string,
  options: HashOptions,
): Promise<Uint8Array> {
  const iterations = options.iterations ?? 100_000;
  const outputBytes = options.outputBytes ?? 32;
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textToBytes(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: textToBytes(options.salt ?? ""),
      iterations,
    },
    baseKey,
    outputBytes * 8,
  );
  return new Uint8Array(bits);
}

/** scrypt：密码 + 盐 + N/r/p 派生密钥（纯 JS 异步，避免阻塞主线程） */
async function scryptDerive(
  password: string,
  options: HashOptions,
): Promise<Uint8Array> {
  const N = options.scryptN ?? 16_384;
  const r = options.scryptR ?? 8;
  const p = options.scryptP ?? 1;
  const outputBytes = options.outputBytes ?? 32;
  return scryptAsync(textToBytes(password), textToBytes(options.salt ?? ""), {
    N,
    r,
    p,
    dkLen: outputBytes,
  });
}

// ===== MD5 纯 JS 实现（RFC 1321）=====
// K[i] = floor(abs(sin(i + 1)) * 2^32)，模块加载时预计算一次
const MD5_K = Array.from({ length: 64 }, (_, i) =>
  Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296),
);

const MD5_SHIFT = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

function md5(bytes: Uint8Array): Uint8Array {
  const bitLen = bytes.length * 8;
  // 补齐到 64 字节对齐，末尾留 8 字节存位长
  const paddedLen = (((bytes.length + 8) >> 6) << 6) + 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLen >>> 0, true);
  view.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const words = new Uint32Array(16);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4, true);
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      f = (f + a + MD5_K[i] + words[g]) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotl(f, MD5_SHIFT[i])) | 0;
    }
    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}
