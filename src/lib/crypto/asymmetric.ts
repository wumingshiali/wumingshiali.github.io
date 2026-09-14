/**
 * 非对称加密工具：RSA-OAEP / ECDH 混合加密 / 后量子 ML-KEM。
 *
 * 三类算法都遵循同一交互：生成密钥对 → 公钥加密 → 私钥解密。
 * - RSA-OAEP（2048/3072/4096 位）：经典公钥加密，明文长度受模长限制
 * - ECDH 混合加密（P-256/384/521）：临时 ECDH 协商会话密钥 + AES-256-GCM
 *   加密消息，密钥不直接传输（ECIES 风格，走 WebCrypto）
 * - ML-KEM（后量子，FIPS 203）：封装共享密钥 + AES-256-GCM 混合加密，
 *   抗量子计算机攻击（@noble/post-quantum）
 */
import {
  base64ToBytes,
  bytesToBase64,
  bytesToText,
  randomBytes,
  textToBytes,
} from "./utils";
import { ml_kem512, ml_kem768, ml_kem1024 } from "@noble/post-quantum/ml-kem.js";

export type AsymmetricAlgorithm =
  | "RSA-OAEP-2048"
  | "RSA-OAEP-3072"
  | "RSA-OAEP-4096"
  | "ECDH-P-256"
  | "ECDH-P-384"
  | "ECDH-P-521"
  | "ML-KEM-512"
  | "ML-KEM-768"
  | "ML-KEM-1024";

export type AsymmetricFamily = "rsa" | "ecdh" | "mlkem";

export interface AsymmetricAlgoMeta {
  id: AsymmetricAlgorithm;
  label: string;
  family: AsymmetricFamily;
  /** 是否后量子算法 */
  postQuantum?: boolean;
  /** RSA 模长（位） */
  bits?: number;
  /** RSA 单次可加密的最大明文字节数：模长/8 - 2*SHA-256 长度 - 2 */
  maxPlaintextBytes?: number;
  /** ECDH 曲线 */
  curve?: string;
}

export const asymmetricAlgorithms: AsymmetricAlgoMeta[] = [
  { id: "RSA-OAEP-2048", label: "RSA-OAEP 2048 位", family: "rsa", bits: 2048, maxPlaintextBytes: 190 },
  { id: "RSA-OAEP-3072", label: "RSA-OAEP 3072 位", family: "rsa", bits: 3072, maxPlaintextBytes: 318 },
  { id: "RSA-OAEP-4096", label: "RSA-OAEP 4096 位", family: "rsa", bits: 4096, maxPlaintextBytes: 446 },
  { id: "ECDH-P-256", label: "ECC ECDH-P-256（混合加密）", family: "ecdh", curve: "P-256" },
  { id: "ECDH-P-384", label: "ECC ECDH-P-384（混合加密）", family: "ecdh", curve: "P-384" },
  { id: "ECDH-P-521", label: "ECC ECDH-P-521（混合加密）", family: "ecdh", curve: "P-521" },
  { id: "ML-KEM-512", label: "后量子 ML-KEM-512（FIPS 203）", family: "mlkem", postQuantum: true },
  { id: "ML-KEM-768", label: "后量子 ML-KEM-768（FIPS 203）", family: "mlkem", postQuantum: true },
  { id: "ML-KEM-1024", label: "后量子 ML-KEM-1024（FIPS 203）", family: "mlkem", postQuantum: true },
];

/** 密钥文本对：RSA / ECDH 为 PEM，ML-KEM 为 base64 */
export interface KeyPairText {
  publicKey: string;
  privateKey: string;
}

export function getAlgoMeta(algo: AsymmetricAlgorithm): AsymmetricAlgoMeta {
  const meta = asymmetricAlgorithms.find((a) => a.id === algo);
  if (!meta) throw new Error(`未知的非对称加密算法：${algo}`);
  return meta;
}

// ===== RSA-OAEP =====

function keyGenParams(bits: number): RsaHashedKeyGenParams {
  return {
    name: "RSA-OAEP",
    modulusLength: bits,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  };
}

function keyImportParams(): RsaHashedImportParams {
  return { name: "RSA-OAEP", hash: "SHA-256" };
}

/** 生成 RSA-OAEP 密钥对（可导出 PEM） */
export async function generateRsaKeyPair(
  bits: number,
): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(keyGenParams(bits), true, [
    "encrypt",
    "decrypt",
  ]);
}

/** 导出公钥为 SPKI PEM 文本 */
export async function exportPublicKeyPem(publicKey: CryptoKey): Promise<string> {
  const der = await crypto.subtle.exportKey("spki", publicKey);
  return pemEncode("PUBLIC KEY", new Uint8Array(der));
}

/** 导出私钥为 PKCS#8 PEM 文本 */
export async function exportPrivateKeyPem(privateKey: CryptoKey): Promise<string> {
  const der = await crypto.subtle.exportKey("pkcs8", privateKey);
  return pemEncode("PRIVATE KEY", new Uint8Array(der));
}

/** 从 SPKI PEM 导入公钥 */
export async function importPublicKeyPem(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    pemDecode("PUBLIC KEY", pem),
    keyImportParams(),
    true,
    ["encrypt"],
  );
}

/** 从 PKCS#8 PEM 导入私钥 */
export async function importPrivateKeyPem(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    pemDecode("PRIVATE KEY", pem),
    keyImportParams(),
    true,
    ["decrypt"],
  );
}

/** 公钥加密字节：返回 base64 密文 */
export async function rsaEncryptBytes(
  publicKey: CryptoKey,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const ciphertext = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    bytes,
  );
  return bytesToBase64(new Uint8Array(ciphertext));
}

/** 公钥加密文本：返回 base64 密文 */
export async function rsaEncrypt(
  publicKey: CryptoKey,
  plaintext: string,
): Promise<string> {
  return rsaEncryptBytes(publicKey, textToBytes(plaintext));
}

/** 私钥解密：接收 base64 密文，返回原始字节 */
export async function rsaDecryptBytes(
  privateKey: CryptoKey,
  ciphertextBase64: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBytes(ciphertextBase64),
  );
  return new Uint8Array(plaintext);
}

/** 私钥解密：接收 base64 密文，返回明文文本 */
export async function rsaDecrypt(
  privateKey: CryptoKey,
  ciphertextBase64: string,
): Promise<string> {
  return bytesToText(await rsaDecryptBytes(privateKey, ciphertextBase64));
}

function pemEncode(label: string, der: Uint8Array): string {
  const base64 = bytesToBase64(der);
  const lines = base64.match(/.{1,64}/g) ?? [base64];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

function pemDecode(label: string, pem: string): Uint8Array<ArrayBuffer> {
  const match = pem.match(
    new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`),
  );
  if (!match) throw new Error(`${label} PEM 格式不正确`);
  return base64ToBytes(match[1]);
}

// ===== ECDH 混合加密（ECIES 风格）=====

const ECDH_KEY_USAGES = ["deriveBits"] as const;


async function ecdhImportPublicKey(pem: string, curve: string): Promise<CryptoKey> {
  const der = pemDecode("PUBLIC KEY", pem);
  return crypto.subtle.importKey("spki", der, { name: "ECDH", namedCurve: curve }, true, []);
}

async function ecdhImportPrivateKey(pem: string, curve: string): Promise<CryptoKey> {
  const der = pemDecode("PRIVATE KEY", pem);
  return crypto.subtle.importKey("pkcs8", der, { name: "ECDH", namedCurve: curve }, true, ECDH_KEY_USAGES);
}

/** HKDF-SHA256：把共享密钥拉伸为 AES-256-GCM 密钥（info 区分用途） */
async function hkdfToAesGcm(sharedSecret: Uint8Array<ArrayBuffer>, info: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: randomBytes(0), info: textToBytes(info) },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** 生成 ECDH 密钥对并导出 PEM */
async function ecdhGenerateKeyPair(curve: string): Promise<KeyPairText> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: curve },
    true,
    ECDH_KEY_USAGES,
  );
  return {
    publicKey: await exportPublicKeyPem(pair.publicKey),
    privateKey: await exportPrivateKeyPem(pair.privateKey),
  };
}

/**
 * ECDH 混合加密：临时密钥对 + 接收方公钥协商共享密钥，
 * 经 HKDF 派生出 AES-256-GCM 密钥加密消息。
 * 密文格式：v1:ecdh:<曲线>:<临时公钥 SPKI base64>:<IV base64>:<数据 base64>
 */
async function ecdhEncryptBytes(
  curve: string,
  publicKeyPem: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const peerPublic = await ecdhImportPublicKey(publicKeyPem, curve);
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: curve },
    true,
    ECDH_KEY_USAGES,
  );
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublic },
    ephemeral.privateKey,
    256,
  );
  const aesKey = await hkdfToAesGcm(new Uint8Array(sharedSecret), "ecdh");
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    bytes,
  );
  const ephemeralPubDer = await crypto.subtle.exportKey("spki", ephemeral.publicKey);
  return [
    "v1",
    "ecdh",
    curve,
    bytesToBase64(new Uint8Array(ephemeralPubDer)),
    bytesToBase64(iv),
    bytesToBase64(new Uint8Array(ciphertext)),
  ].join(":");
}

/** ECDH 混合解密：解析密文后用自己的私钥 + 对方临时公钥还原会话密钥，返回原始字节 */
async function ecdhDecryptBytes(
  curve: string,
  privateKeyPem: string,
  payload: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const parts = payload.split(":");
  if (
    parts.length !== 6 ||
    parts[0] !== "v1" ||
    parts[1] !== "ecdh" ||
    parts[2] !== curve
  ) {
    throw new Error("密文格式不正确，请粘贴本工具生成的 ECDH 密文");
  }
  const privateKey = await ecdhImportPrivateKey(privateKeyPem, curve);
  const ephemeralPublic = await crypto.subtle.importKey(
    "spki",
    base64ToBytes(parts[3]),
    { name: "ECDH", namedCurve: curve },
    true,
    [],
  );
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: ephemeralPublic },
    privateKey,
    256,
  );
  const aesKey = await hkdfToAesGcm(new Uint8Array(sharedSecret), "ecdh");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(parts[4]) },
    aesKey,
    base64ToBytes(parts[5]),
  );
  return new Uint8Array(plaintext);
}

// ===== 后量子 ML-KEM（FIPS 203）=====

const MLKEM_VARIANTS = {
  "ML-KEM-512": ml_kem512,
  "ML-KEM-768": ml_kem768,
  "ML-KEM-1024": ml_kem1024,
} as const;

/** 生成 ML-KEM 密钥对，密钥以 base64 文本呈现 */
function mlkemGenerateKeyPair(algo: AsymmetricAlgorithm): KeyPairText {
  const { publicKey, secretKey } = MLKEM_VARIANTS[algo as keyof typeof MLKEM_VARIANTS].keygen();
  return {
    publicKey: bytesToBase64(publicKey),
    privateKey: bytesToBase64(secretKey),
  };
}

/**
 * ML-KEM 混合加密：封装共享密钥 + AES-256-GCM 加密消息。
 * 密文格式：v1:mlkem:<算法>:<封装密文 base64>:<IV base64>:<数据 base64>
 */
async function mlkemEncryptBytes(
  algo: AsymmetricAlgorithm,
  publicKeyB64: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const kem = MLKEM_VARIANTS[algo as keyof typeof MLKEM_VARIANTS];
  const { cipherText, sharedSecret } = kem.encapsulate(base64ToBytes(publicKeyB64));
  const aesKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    bytes,
  );
  return [
    "v1",
    "mlkem",
    algo,
    bytesToBase64(cipherText),
    bytesToBase64(iv),
    bytesToBase64(new Uint8Array(ciphertext)),
  ].join(":");
}

/** ML-KEM 混合解密：解封装共享密钥后用 AES-256-GCM 还原原始字节 */
async function mlkemDecryptBytes(
  algo: AsymmetricAlgorithm,
  privateKeyB64: string,
  payload: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const parts = payload.split(":");
  if (
    parts.length !== 6 ||
    parts[0] !== "v1" ||
    parts[1] !== "mlkem" ||
    parts[2] !== algo
  ) {
    throw new Error("密文格式不正确，请粘贴本工具生成的 ML-KEM 密文");
  }
  const kem = MLKEM_VARIANTS[algo as keyof typeof MLKEM_VARIANTS];
  const sharedSecret = kem.decapsulate(
    base64ToBytes(parts[3]),
    base64ToBytes(privateKeyB64),
  );
  const aesKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(parts[4]) },
    aesKey,
    base64ToBytes(parts[5]),
  );
  return new Uint8Array(plaintext);
}

// ===== 统一门面（工具页使用）=====

/** 生成指定算法的密钥对，返回可复制保存的文本 */
export async function generateKeyPairText(
  algo: AsymmetricAlgorithm,
): Promise<KeyPairText> {
  const meta = getAlgoMeta(algo);
  if (meta.family === "rsa") {
    const pair = await generateRsaKeyPair(meta.bits as number);
    return {
      publicKey: await exportPublicKeyPem(pair.publicKey),
      privateKey: await exportPrivateKeyPem(pair.privateKey),
    };
  }
  if (meta.family === "ecdh") {
    return ecdhGenerateKeyPair(meta.curve as string);
  }
  return mlkemGenerateKeyPair(algo);
}

/** 用公钥加密字节，返回自描述密文 */
export async function encryptBytesWithPublicKey(
  algo: AsymmetricAlgorithm,
  publicKeyText: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const meta = getAlgoMeta(algo);
  if (meta.family === "rsa") {
    const publicKey = await importPublicKeyPem(publicKeyText);
    return rsaEncryptBytes(publicKey, bytes);
  }
  if (meta.family === "ecdh") {
    return ecdhEncryptBytes(meta.curve as string, publicKeyText, bytes);
  }
  return mlkemEncryptBytes(algo, publicKeyText, bytes);
}

/** 用公钥加密明文，返回自描述密文 */
export async function encryptWithPublicKey(
  algo: AsymmetricAlgorithm,
  publicKeyText: string,
  plaintext: string,
): Promise<string> {
  return encryptBytesWithPublicKey(algo, publicKeyText, textToBytes(plaintext));
}

/** 用私钥解密密文，返回原始字节（文件模式用） */
export async function decryptBytesWithPrivateKey(
  algo: AsymmetricAlgorithm,
  privateKeyText: string,
  payload: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const meta = getAlgoMeta(algo);
  if (meta.family === "rsa") {
    const privateKey = await importPrivateKeyPem(privateKeyText);
    return rsaDecryptBytes(privateKey, payload);
  }
  if (meta.family === "ecdh") {
    return ecdhDecryptBytes(meta.curve as string, privateKeyText, payload);
  }
  return mlkemDecryptBytes(algo, privateKeyText, payload);
}

/** 用私钥解密密文，返回明文文本 */
export async function decryptWithPrivateKey(
  algo: AsymmetricAlgorithm,
  privateKeyText: string,
  payload: string,
): Promise<string> {
  return bytesToText(
    await decryptBytesWithPrivateKey(algo, privateKeyText, payload),
  );
}