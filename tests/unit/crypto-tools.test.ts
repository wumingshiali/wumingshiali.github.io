/**
 * 加密工具核心逻辑单元测试。
 *
 * 覆盖：
 * - 单向加密：MD5（纯 JS）与 SHA 系列（WebCrypto）的标准测试向量
 * - 对称加密：四种算法的加解密往返、格式自描述、错误密码拒绝、随机盐
 * - 非对称加密：RSA-OAEP 密钥对生成 / PEM 导出导入 / 加解密往返 / 明文长度上限
 */
import { describe, expect, it } from "vitest";
import { hashBytes, hashText, hashAlgorithms } from "@/lib/crypto/hash";
import {
  symmetricAlgorithms,
  symmetricDecrypt,
  symmetricDecryptBytes,
  symmetricEncrypt,
  symmetricEncryptBytes,
} from "@/lib/crypto/symmetric";
import {
  asymmetricAlgorithms,
  decryptBytesWithPrivateKey,
  decryptWithPrivateKey,
  encryptBytesWithPublicKey,
  encryptWithPublicKey,
  exportPrivateKeyPem,
  exportPublicKeyPem,
  generateKeyPairText,
  generateRsaKeyPair,
  importPrivateKeyPem,
  importPublicKeyPem,
  rsaDecrypt,
  rsaEncrypt,
} from "@/lib/crypto/asymmetric";

describe("单向加密（哈希）", () => {
  it("MD5 标准测试向量", async () => {
    expect(await hashText("MD5", "")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(await hashText("MD5", "abc")).toBe(
      "900150983cd24fb0d6963f7d28e17f72",
    );
    expect(await hashText("MD5", "The quick brown fox jumps over the lazy dog")).toBe(
      "9e107d9d372bb6826bd81d3542a419d6",
    );
  });

  it("SHA-1 / SHA-256 / SHA-384 / SHA-512 标准测试向量", async () => {
    expect(await hashText("SHA-1", "abc")).toBe(
      "a9993e364706816aba3e25717850c26c9cd0d89d",
    );
    expect(await hashText("SHA-256", "")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(await hashText("SHA-256", "abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(await hashText("SHA-384", "abc")).toBe(
      "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed" +
        "8086072ba1e7cc2358baeca134c825a7",
    );
    expect(await hashText("SHA-512", "abc")).toBe(
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" +
        "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    );
  });

  it("所有算法输出长度与算法一致，且中文字符按 UTF-8 计算", async () => {
    const text = "猫娘工程师幽浮喵";
    const expectedLengths: Record<string, number> = {
      MD5: 32,
      "SHA-1": 40,
      "SHA-256": 64,
      "SHA-384": 96,
      "SHA-512": 128,
      "HMAC-SHA256": 64,
      "HMAC-SHA512": 128,
      "PBKDF2-SHA256": 64,
      SCRYPT: 64,
    };
    for (const algo of hashAlgorithms) {
      const digest = await hashText(algo.id, text, { secret: "key", salt: "salt" });
      expect(digest).toMatch(/^[0-9a-f]+$/);
      expect(digest).toHaveLength(expectedLengths[algo.id]);
    }
  });
});

describe("对称加密", () => {
  const plaintext = "秘密内容：喵～ 12345";

  for (const algo of symmetricAlgorithms) {
    it(`${algo.id} 加解密往返`, async () => {
      const payload = await symmetricEncrypt(algo.id, plaintext, "correct horse battery staple");
      expect(payload.startsWith(`v1:${algo.id}:`)).toBe(true);
      // 自描述格式：v1:<算法>:<盐>:<IV>:<数据>
      expect(payload.split(":")).toHaveLength(5);
      expect(await symmetricDecrypt(payload, "correct horse battery staple")).toBe(
        plaintext,
      );
    });
  }

  it("同一明文两次加密结果不同（随机盐 + IV）", async () => {
    const a = await symmetricEncrypt("AES-256-GCM", plaintext, "password");
    const b = await symmetricEncrypt("AES-256-GCM", plaintext, "password");
    expect(a).not.toBe(b);
  });

  it("GCM 密码错误时拒绝解密（完整性校验）", async () => {
    const payload = await symmetricEncrypt("AES-256-GCM", plaintext, "right");
    await expect(symmetricDecrypt(payload, "wrong")).rejects.toThrow();
  });

  it("格式损坏时给出明确错误", async () => {
    await expect(symmetricDecrypt("garbage", "password")).rejects.toThrow(
      "密文格式不正确",
    );
  });

  it("空密码被拒绝", async () => {
    await expect(symmetricEncrypt("AES-256-GCM", plaintext, "")).rejects.toThrow(
      "请输入密码",
    );
  });
});

describe("非对称加密（RSA-OAEP）", () => {
  const plaintext = "公钥加密、私钥解密喵～";

  it("密钥对生成 → PEM 导出 → 导入 → 加解密往返", async () => {
    const pair = await generateRsaKeyPair(2048);
    const publicPem = await exportPublicKeyPem(pair.publicKey);
    const privatePem = await exportPrivateKeyPem(pair.privateKey);

    expect(publicPem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(publicPem).toContain("-----END PUBLIC KEY-----");
    expect(privatePem).toContain("-----BEGIN PRIVATE KEY-----");
    expect(privatePem).toContain("-----END PRIVATE KEY-----");

    const publicKey = await importPublicKeyPem(publicPem);
    const privateKey = await importPrivateKeyPem(privatePem);
    const ciphertext = await rsaEncrypt(publicKey, plaintext);
    expect(await rsaDecrypt(privateKey, ciphertext)).toBe(plaintext);
  });

  it("超过单次上限的明文加密被拒绝", async () => {
    const pair = await generateRsaKeyPair(2048);
    const longText = "a".repeat(191); // RSA-2048 + SHA-256 OAEP 上限 190 字节
    await expect(rsaEncrypt(pair.publicKey, longText)).rejects.toThrow();
  });

  it("RSA 算法元数据提供正确的明文上限", async () => {
    for (const algo of asymmetricAlgorithms.filter((a) => a.family === "rsa")) {
      expect(algo.maxPlaintextBytes).toBeGreaterThan(0);
    }
  });

  it("PEM 格式不正确时导入报错", async () => {
    await expect(importPublicKeyPem("not a pem")).rejects.toThrow();
  });
});

describe("单向加密：密钥散列（HMAC）", () => {
  const message = "The quick brown fox jumps over the lazy dog";

  it("HMAC-SHA256 标准测试向量", async () => {
    expect(await hashText("HMAC-SHA256", message, { secret: "key" })).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("HMAC-SHA512 标准测试向量", async () => {
    expect(await hashText("HMAC-SHA512", message, { secret: "key" })).toBe(
      "b42af09057bac1e2d41708e48a902e09b5ff7f12ab428a4fe86653c73dd248fb8" +
        "2f948a549f7b791a5b41915ee4d1ec3935357e4e2317250d0372afa2ebeeb3a",
    );
  });

  it("相同消息不同密钥结果不同", async () => {
    const a = await hashText("HMAC-SHA256", message, { secret: "key-a" });
    const b = await hashText("HMAC-SHA256", message, { secret: "key-b" });
    expect(a).not.toBe(b);
  });
});

describe("单向加密：加盐密码派生（PBKDF2 / scrypt）", () => {
  it("PBKDF2-HMAC-SHA256 RFC 7914 测试向量（iterations=1）", async () => {
    expect(
      await hashText("PBKDF2-SHA256", "password", {
        salt: "salt",
        iterations: 1,
      }),
    ).toBe("120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b");
  });

  it("scrypt RFC 7914 测试向量（N=1024, r=8, p=16）", async () => {
    expect(
      await hashText("SCRYPT", "password", {
        salt: "NaCl",
        scryptN: 1024,
        scryptR: 8,
        scryptP: 16,
        outputBytes: 64,
      }),
    ).toBe(
      "fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b373162" +
        "2eaf30d92e22a3886ff109279d9830dac727afb94a83ee6d8360cbdfa2cc0640",
    );
  });

  it("PBKDF2 默认参数输出 32 字节（64 位十六进制）", async () => {
    const result = await hashText("PBKDF2-SHA256", "password", {
      salt: "salt",
    });
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("同一密码不同盐结果不同（抗彩虹表）", async () => {
    const a = await hashText("PBKDF2-SHA256", "password", { salt: "salt-a" });
    const b = await hashText("PBKDF2-SHA256", "password", { salt: "salt-b" });
    expect(a).not.toBe(b);
  });
});

describe("非对称加密：ECC（ECDH 混合加密）", () => {
  const plaintext = "椭圆曲线混合加密喵～";

  for (const algo of ["ECDH-P-256", "ECDH-P-384", "ECDH-P-521"] as const) {
    it(`${algo} 密钥生成 → PEM → 加解密往返`, async () => {
      const pair = await generateKeyPairText(algo);
      expect(pair.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
      expect(pair.privateKey).toContain("-----BEGIN PRIVATE KEY-----");

      const ciphertext = await encryptWithPublicKey(
        algo,
        pair.publicKey,
        plaintext,
      );
      expect(ciphertext.startsWith(`v1:ecdh:`)).toBe(true);
      expect(await decryptWithPrivateKey(algo, pair.privateKey, ciphertext)).toBe(
        plaintext,
      );
    });
  }
});

describe("非对称加密：后量子 ML-KEM", () => {
  const plaintext = "后量子加密喵～ 抗量子攻击";

  for (const algo of ["ML-KEM-512", "ML-KEM-768", "ML-KEM-1024"] as const) {
    it(`${algo} 密钥生成 → base64 → 加解密往返`, async () => {
      const pair = await generateKeyPairText(algo);
      // ML-KEM 密钥为 base64 文本（无 PEM 标准）
      expect(pair.publicKey).not.toContain("BEGIN");
      expect(pair.privateKey).not.toContain("BEGIN");

      const ciphertext = await encryptWithPublicKey(
        algo,
        pair.publicKey,
        plaintext,
      );
      expect(ciphertext.startsWith(`v1:mlkem:${algo}:`)).toBe(true);
      expect(await decryptWithPrivateKey(algo, pair.privateKey, ciphertext)).toBe(
        plaintext,
      );
    });
  }

  it("错误私钥解密失败", async () => {
    const pairA = await generateKeyPairText("ML-KEM-768");
    const pairB = await generateKeyPairText("ML-KEM-768");
    const ciphertext = await encryptWithPublicKey(
      "ML-KEM-768",
      pairA.publicKey,
      "机密",
    );
    await expect(
      decryptWithPrivateKey("ML-KEM-768", pairB.privateKey, ciphertext),
    ).rejects.toThrow();
  });
});

describe("单向加密：文件字节哈希（hashBytes）", () => {
  const enc = (s: string) => new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>;

  it("SHA-256 对文件字节计算正确", async () => {
    expect(await hashBytes("SHA-256", enc("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("MD5 对空文件（0 字节）计算正确", async () => {
    expect(await hashBytes("MD5", new Uint8Array(0))).toBe(
      "d41d8cd98f00b204e9800998ecf8427e",
    );
  });

  it("HMAC-SHA256 对文件字节 + 密钥计算正确", async () => {
    expect(
      await hashBytes(
        "HMAC-SHA256",
        enc("The quick brown fox jumps over the lazy dog"),
        { secret: "key" },
      ),
    ).toBe("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
  });

  it("密码派生算法不适用于文件，抛错", async () => {
    await expect(hashBytes("PBKDF2-SHA256", new Uint8Array(3))).rejects.toThrow(
      "不适用于文件",
    );
  });
});


describe("对称加密：文件字节往返", () => {
  it("AES-256-GCM 二进制字节加密 → 解密 无损还原", async () => {
    const bytes = new Uint8Array([0, 1, 2, 128, 250, 251, 252, 255]) as Uint8Array<ArrayBuffer>;
    const payload = await symmetricEncryptBytes("AES-256-GCM", bytes, "pw");
    const out = await symmetricDecryptBytes(payload, "pw");
    expect(Buffer.from(out).equals(Buffer.from(bytes))).toBe(true);
  });

  it("AES-128-CBC 二进制字节往返", async () => {
    const bytes = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]) as Uint8Array<ArrayBuffer>;
    const payload = await symmetricEncryptBytes("AES-128-CBC", bytes, "pw");
    const out = await symmetricDecryptBytes(payload, "pw");
    expect(Buffer.from(out).equals(Buffer.from(bytes))).toBe(true);
  });
});

describe("非对称加密：文件字节往返", () => {
  it("ML-KEM-768 二进制字节加密 → 解密 无损还原", async () => {
    const pair = await generateKeyPairText("ML-KEM-768");
    const bytes = new Uint8Array([0, 255, 1, 128, 42, 7]) as Uint8Array<ArrayBuffer>;
    const payload = await encryptBytesWithPublicKey("ML-KEM-768", pair.publicKey, bytes);
    const out = await decryptBytesWithPrivateKey("ML-KEM-768", pair.privateKey, payload);
    expect(Buffer.from(out).equals(Buffer.from(bytes))).toBe(true);
  });

  it("ECDH-P-256 二进制字节往返", async () => {
    const pair = await generateKeyPairText("ECDH-P-256");
    const bytes = new Uint8Array([3, 1, 4, 1, 5, 9, 2, 6]) as Uint8Array<ArrayBuffer>;
    const payload = await encryptBytesWithPublicKey("ECDH-P-256", pair.publicKey, bytes);
    const out = await decryptBytesWithPrivateKey("ECDH-P-256", pair.privateKey, payload);
    expect(Buffer.from(out).equals(Buffer.from(bytes))).toBe(true);
  });
});
