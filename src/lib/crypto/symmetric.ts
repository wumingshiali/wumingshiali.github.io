/**
 * 对称加密工具：同一个密码既加密又解密。
 *
 * - 密码经 PBKDF2-SHA256 拉伸成 AES 密钥（盐随机，每次加密都不同）
 * - 算法可选：AES-128/256-GCM（带完整性校验，推荐）/ AES-128/256-CBC（无校验）
 * - 密文格式（可自描述，解密端无需额外参数）：
 *   v1:<算法>:<盐 base64>:<IV base64>:<数据 base64>
 *   GCM 模式下 WebCrypto 返回的数据末尾自带认证标签，可直接解密
 */
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

/** PBKDF2 迭代次数：浏览器端可在百毫秒级完成，兼顾安全与响应 */
export const PBKDF2_ITERATIONS = 150_000;

/** 密文格式版本前缀，便于未来扩展格式 */
const FORMAT_VERSION = "v1";

function getAlgoMeta(algo: SymmetricAlgorithm): SymmetricAlgoMeta {
  const meta = symmetricAlgorithms.find((a) => a.id === algo);
  if (!meta) throw new Error(`未知的对称加密算法：${algo}`);
  return meta;
}

function getAesName(mode: SymmetricMode): string {
  return `AES-${mode}`;
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  meta: SymmetricAlgoMeta,
): Promise<CryptoKey> {
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

/** 加密任意字节，返回自描述密文字符串 */
export async function symmetricEncryptBytes(
  algorithm: SymmetricAlgorithm,
  bytes: Uint8Array<ArrayBuffer>,
  password: string,
): Promise<string> {
  if (!password) throw new Error("请输入密码");
  const meta = getAlgoMeta(algorithm);
  const salt = randomBytes(16);
  // GCM 用 12 字节 IV；CBC 用 16 字节（块大小）
  const iv = randomBytes(meta.mode === "GCM" ? 12 : 16);
  const key = await deriveKey(password, salt, meta);
  const ciphertext = await crypto.subtle.encrypt(
    { name: getAesName(meta.mode), iv },
    key,
    bytes,
  );
  return [
    FORMAT_VERSION,
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
): Promise<string> {
  return symmetricEncryptBytes(algorithm, textToBytes(plaintext), password);
}

/** 解密自描述密文，返回原始字节（文件模式用）；密码错误或数据被篡改时抛错 */
export async function symmetricDecryptBytes(
  payload: string,
  password: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!password) throw new Error("请输入密码");
  const parts = payload.split(":");
  if (parts.length !== 5 || parts[0] !== FORMAT_VERSION) {
    throw new Error("密文格式不正确，请粘贴本工具生成的密文");
  }
  const [, algo, saltB64, ivB64, dataB64] = parts;
  const meta = getAlgoMeta(algo as SymmetricAlgorithm);
  const key = await deriveKey(password, base64ToBytes(saltB64), meta);
  const plaintext = await crypto.subtle.decrypt(
    { name: getAesName(meta.mode), iv: base64ToBytes(ivB64) },
    key,
    base64ToBytes(dataB64),
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
