/**
 * 对称加密工具：同一个密码既加密又解密。
 *
 * - 密码经 KDF 拉伸成 AES 密钥（盐随机，每次加密都不同）
 * - KDF 可选：Argon2id（推荐，内存困难型）/ Argon2i / Argon2d（@noble/hashes
 *   纯 JS 实现，浏览器 WebCrypto 不支持）/ PBKDF2-SHA256（兼容 v1 旧密文）
 * - 算法可选：AES-128/256-GCM（带完整性校验，推荐）/ AES-128/256-CBC（无校验）
 * - 密文格式（自描述，解密端无需额外参数）：
 *   v2:<KDF>:<算法>:<盐 base64>:<IV base64>:<数据 base64>
 *   v1:<算法>:<盐 base64>:<IV base64>:<数据 base64>（旧版，KDF 固定 PBKDF2）
 *   GCM 模式下 WebCrypto 返回的数据末尾自带认证标签，可直接解密
 */
import { argon2dAsync, argon2iAsync, argon2idAsync } from "@noble/hashes/argon2.js";
import {
  base64ToBytes,
  bytesToBase64,
  bytesToText,
  randomBytes,
  textToBytes,
} from "./utils";

export type SymmetricAlgorithm =
  | "AES-128-GCM"
  | "AES-256-GCM"
  | "AES-128-CBC"
  | "AES-256-CBC";

export type SymmetricMode = "GCM" | "CBC";

export interface SymmetricAlgoMeta {
  id: SymmetricAlgorithm;
  label: string;
  mode: SymmetricMode;
  bits: number;
  note: string;
}

export const symmetricAlgorithms: SymmetricAlgoMeta[] = [
  { id: "AES-128-GCM", label: "AES-128-GCM", mode: "GCM", bits: 128, note: "推荐，带完整性校验" },
  { id: "AES-256-GCM", label: "AES-256-GCM", mode: "GCM", bits: 256, note: "推荐，带完整性校验" },
  { id: "AES-128-CBC", label: "AES-128-CBC", mode: "CBC", bits: 128, note: "无完整性校验" },
  { id: "AES-256-CBC", label: "AES-256-CBC", mode: "CBC", bits: 256, note: "无完整性校验" },
];

/** 密钥派生算法（KDF） */
export type KdfAlgorithm = "argon2id" | "argon2i" | "argon2d" | "PBKDF2-SHA256";

export interface KdfMeta {
  id: KdfAlgorithm;
  label: string;
  note: string;
}

export const kdfAlgorithms: KdfMeta[] = [
  { id: "argon2id", label: "Argon2id", note: "推荐，内存困难型" },
  { id: "argon2i", label: "Argon2i", note: "抗侧信道" },
  { id: "argon2d", label: "Argon2d", note: "抗 GPU 并行破解" },
  { id: "PBKDF2-SHA256", label: "PBKDF2-SHA256", note: "兼容 v1 旧密文" },
];

/** PBKDF2 迭代次数：浏览器端可在百毫秒级完成，兼顾安全与响应 */
export const PBKDF2_ITERATIONS = 150_000;

/**
 * Argon2 参数：RFC 9106 推荐值之上取更安全的默认（32 MiB / t=3 / p=1），
 * 浏览器异步执行，内存占用可控。
 */
export const ARGON2_T = 3;
export const ARGON2_M_KIB = 32 * 1024; // 32 MiB
export const ARGON2_P = 1;

/** 当前密文格式版本前缀 */
const FORMAT_VERSION = "v2";
/** 旧版密文格式（KDF 固定 PBKDF2），解密时向后兼容 */
const LEGACY_FORMAT_VERSION = "v1";

function getAlgoMeta(algo: SymmetricAlgorithm): SymmetricAlgoMeta {
  const meta = symmetricAlgorithms.find((a) => a.id === algo);
  if (!meta) throw new Error(`未知的对称加密算法：${algo}`);
  return meta;
}

function getAesName(mode: SymmetricMode): string {
  return `AES-${mode}`;
}

/** Argon2 派生：输出与 AES 密钥等长的字节，再导入为 AES 密钥 */
async function argon2Derive(
  kdf: "argon2id" | "argon2i" | "argon2d",
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  bits: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const opts = { t: ARGON2_T, m: ARGON2_M_KIB, p: ARGON2_P, dkLen: bits / 8 };
  const out =
    kdf === "argon2i"
      ? await argon2iAsync(textToBytes(password), salt, opts)
      : kdf === "argon2d"
        ? await argon2dAsync(textToBytes(password), salt, opts)
        : await argon2idAsync(textToBytes(password), salt, opts);
  // @noble 返回 ArrayBufferLike 字节，复制到 ArrayBuffer 上满足 WebCrypto BufferSource
  return new Uint8Array(out);
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  meta: SymmetricAlgoMeta,
  kdf: KdfAlgorithm,
): Promise<CryptoKey> {
  if (kdf !== "PBKDF2-SHA256") {
    const keyBytes = await argon2Derive(kdf, password, salt, meta.bits);
    return crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: getAesName(meta.mode), length: meta.bits },
      false,
      ["encrypt", "decrypt"],
    );
  }
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textToBytes(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: getAesName(meta.mode), length: meta.bits },
    false,
    ["encrypt", "decrypt"],
  );
}

/** 解析后的自描述密文结构 */
export interface SymmetricPayloadInfo {
  version: "v1" | "v2";
  kdf: KdfAlgorithm;
  algorithm: SymmetricAlgorithm;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  data: Uint8Array<ArrayBuffer>;
}

/**
 * 解析自描述密文：兼容 v1（固定 PBKDF2）与 v2（显式 KDF）。
 * 格式不合法时抛错，供加密 / 解密与页面展示共用。
 */
export function parseSymmetricPayload(payload: string): SymmetricPayloadInfo {
  const parts = payload.split(":");
  if (parts[0] === LEGACY_FORMAT_VERSION && parts.length === 5) {
    const [, algo, saltB64, ivB64, dataB64] = parts;
    return {
      version: "v1",
      kdf: "PBKDF2-SHA256",
      algorithm: algo as SymmetricAlgorithm,
      salt: base64ToBytes(saltB64),
      iv: base64ToBytes(ivB64),
      data: base64ToBytes(dataB64),
    };
  }
  if (parts[0] === FORMAT_VERSION && parts.length === 6) {
    const [, kdf, algo, saltB64, ivB64, dataB64] = parts;
    return {
      version: "v2",
      kdf: kdf as KdfAlgorithm,
      algorithm: algo as SymmetricAlgorithm,
      salt: base64ToBytes(saltB64),
      iv: base64ToBytes(ivB64),
      data: base64ToBytes(dataB64),
    };
  }
  throw new Error("密文格式不正确，请粘贴本工具生成的密文");
}

/** 加密任意字节，返回自描述密文字符串 */
export async function symmetricEncryptBytes(
  algorithm: SymmetricAlgorithm,
  bytes: Uint8Array<ArrayBuffer>,
  password: string,
  kdf: KdfAlgorithm = "argon2id",
): Promise<string> {
  if (!password) throw new Error("请输入密码");
  const meta = getAlgoMeta(algorithm);
  const salt = randomBytes(16);
  // GCM 用 12 字节 IV；CBC 用 16 字节（块大小）
  const iv = randomBytes(meta.mode === "GCM" ? 12 : 16);
  const key = await deriveKey(password, salt, meta, kdf);
  const ciphertext = await crypto.subtle.encrypt(
    { name: getAesName(meta.mode), iv },
    key,
    bytes,
  );
  return [
    FORMAT_VERSION,
    kdf,
    algorithm,
    bytesToBase64(salt),
    bytesToBase64(iv),
    bytesToBase64(new Uint8Array(ciphertext)),
  ].join(":");
}

/** 加密明文文本，返回自描述密文字符串 */
export async function symmetricEncrypt(
  algorithm: SymmetricAlgorithm,
  plaintext: string,
  password: string,
  kdf: KdfAlgorithm = "argon2id",
): Promise<string> {
  return symmetricEncryptBytes(algorithm, textToBytes(plaintext), password, kdf);
}

/** 解密自描述密文，返回原始字节（文件模式用）；密码错误或数据被篡改时抛错 */
export async function symmetricDecryptBytes(
  payload: string,
  password: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!password) throw new Error("请输入密码");
  const info = parseSymmetricPayload(payload);
  const meta = getAlgoMeta(info.algorithm);
  const key = await deriveKey(password, info.salt, meta, info.kdf);
  const plaintext = await crypto.subtle.decrypt(
    { name: getAesName(meta.mode), iv: info.iv },
    key,
    info.data,
  );
  return new Uint8Array(plaintext);
}

/** 解密自描述密文，返回文本；密码错误或数据被篡改时抛错 */
export async function symmetricDecrypt(
  payload: string,
  password: string,
): Promise<string> {
  return bytesToText(await symmetricDecryptBytes(payload, password));
}
