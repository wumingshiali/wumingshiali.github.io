/**
 * 联系方式密文配置（由 scripts/encrypt-contacts.mjs 生成）
 *
 * 安全说明：此处仅含 AES-GCM 密文与 nonce，不含明文联系方式、不含明文密钥。
 * 解密密钥由用户在 Dialog 中输入的"人机验证答案"按固定规则补齐到 16 字节得到。
 * bot 扫描源码只能拿到无法还原的密文。
 */
// 静态导入确保 Vite 正确打包；动态 import 子路径在部分环境下 fetch 失败
// 注意：子路径须带 .js 后缀（@noble/ciphers 的 exports 字段如此定义）
import { gcm as gcmWebcrypto } from "@noble/ciphers/webcrypto.js";
import { gcm as gcmJs } from "@noble/ciphers/aes.js";

export const contactSecret = {
  // 人机验证题目
  question: "1 + 1 等于几？",
  // 各联系项密文（base64），共用同一答案密钥
  secrets: {
    email: {
      ciphertext: "WSIq37Co46v4eqYmkt6HALc12BDP5BBM8uJ5uGgCpWGgMu6CFAwnEyM=",
      nonce: "Xb47nnJSBBBHPd6G",
    },
    wechat: {
      ciphertext: "CStjRaTcGJBRWKkyX8oAShFXXji2XL/HSw==",
      nonce: "ZnlhfQbY+v05IOBG",
    },
  },
} as const;

// 支持的联系项名称
export type ContactName = keyof typeof contactSecret.secrets;

// AES-128 密钥固定长度
const KEY_LENGTH = 16;

/**
 * 将用户答案转为 AES-128 密钥：UTF-8 编码后右侧补 0 到 16 字节。
 * padding 规则公开，安全性依赖"答案本身是秘密"。
 */
export function deriveKeyFromAnswer(answer: string): Uint8Array {
  const answerBytes = new TextEncoder().encode(answer);
  const key = new Uint8Array(KEY_LENGTH);
  key.set(answerBytes.subarray(0, KEY_LENGTH));
  return key;
}

// base64 → Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * 用答案解密指定联系项，降级链：WebCrypto → 纯 JS AES。
 * 答错则 GCM tag 校验失败，抛出错误（调用方捕获后提示验证失败）。
 */
export async function decryptContact(
  name: ContactName,
  answer: string,
): Promise<string> {
  const secret = contactSecret.secrets[name];
  const key = deriveKeyFromAnswer(answer);
  const nonce = base64ToBytes(secret.nonce);
  const ciphertext = base64ToBytes(secret.ciphertext);
  const plaintextBytes = await decryptAesGcm(key, nonce, ciphertext);
  return new TextDecoder().decode(plaintextBytes);
}

/**
 * 用答案一次性解密全部联系项。任一项失败即整体失败（答错时 GCM 校验不通过）。
 */
export async function decryptAllContacts(
  answer: string,
): Promise<Record<ContactName, string>> {
  const names = Object.keys(contactSecret.secrets) as ContactName[];
  const entries = await Promise.all(
    names.map(async (name) => [name, await decryptContact(name, answer)] as const),
  );
  return Object.fromEntries(entries) as Record<ContactName, string>;
}

/**
 * 解密降级链：优先 WebCrypto（硬件加速），失败回退纯 JS AES。
 * 两者 API 对称，均来自 @noble/ciphers，静态导入确保打包可靠。
 */
async function decryptAesGcm(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  // 第一层：WebCrypto（最快，浏览器/Workers 原生支持）
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    try {
      const cipher = gcmWebcrypto(key, nonce);
      return await cipher.decrypt(ciphertext);
    } catch {
      // 落到纯 JS 回退
    }
  }
  // 第二层：纯 JS AES（兜底，环境无 WebCrypto.subtle 时使用）
  const cipher = gcmJs(key, nonce);
  return cipher.decrypt(ciphertext);
}
