/**
 * 工具页组件测试。
 *
 * 关注：总览页三张工具卡片、哈希页实时计算、对称/非对称页真实加解密往返。
 * 说明：加密逻辑走真实 WebCrypto（Node 环境可用），验证页面交互与结果展示。
 */
import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import ToolsIndexPage from "@/pages/tools/index.vue";
import EncryptionIndexPage from "@/pages/tools/encryption/index.vue";
import ConversionIndexPage from "@/pages/tools/conversion/index.vue";
import HashPage from "@/pages/tools/encryption/hash.vue";
import SymmetricPage from "@/pages/tools/encryption/symmetric.vue";
import AsymmetricPage from "@/pages/tools/encryption/asymmetric.vue";
import ImagePage from "@/pages/tools/conversion/image.vue";
import VideoPage from "@/pages/tools/conversion/video.vue";
import DocumentPage from "@/pages/tools/conversion/document.vue";
import { symmetricEncrypt } from "@/lib/crypto/symmetric";
import {
  encryptWithPublicKey,
  generateKeyPairText,
} from "@/lib/crypto/asymmetric";

async function mountAt(component: unknown, initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(component as never, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
}

// 等防抖计时器 + 异步加密链路完成
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  for (let i = 0; i < 5; i++) {
    await nextTick();
    await flushPromises();
  }
}

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll("button").find((b) => b.text().includes(label))!;
}

describe("/tools 工具总览页", () => {
  it("渲染加密 / 转换两个分组卡片并链接到分组路由", async () => {
    const wrapper = await mountAt(ToolsIndexPage, "/tools");
    expect(wrapper.text()).toContain("加密");
    expect(wrapper.text()).toContain("转换");
    for (const href of ["/tools/encryption", "/tools/conversion"]) {
      expect(wrapper.find(`a[href="${href}"]`).exists()).toBe(true);
    }
  });
});

describe("/tools/encryption 加密分组页", () => {
  it("渲染三张加密工具卡片并链接到对应路由", async () => {
    const wrapper = await mountAt(EncryptionIndexPage, "/tools/encryption");
    expect(wrapper.text()).toContain("单向加密");
    expect(wrapper.text()).toContain("对称加密");
    expect(wrapper.text()).toContain("非对称加密");
    for (const href of [
      "/tools/encryption/hash",
      "/tools/encryption/symmetric",
      "/tools/encryption/asymmetric",
    ]) {
      expect(wrapper.find(`a[href="${href}"]`).exists()).toBe(true);
    }
  });
});

describe("/tools/conversion 转换分组页", () => {
  it("渲染三张转换工具卡片并链接到对应路由", async () => {
    const wrapper = await mountAt(ConversionIndexPage, "/tools/conversion");
    expect(wrapper.text()).toContain("图片转换");
    expect(wrapper.text()).toContain("视频转换");
    expect(wrapper.text()).toContain("文档转换");
    for (const href of [
      "/tools/conversion/image",
      "/tools/conversion/video",
      "/tools/conversion/document",
    ]) {
      expect(wrapper.find(`a[href="${href}"]`).exists()).toBe(true);
    }
  });
});

describe("/tools/encryption/hash 单向加密页", () => {
  it("输入文本后实时输出 SHA-256 摘要", async () => {
    const wrapper = await mountAt(HashPage, "/tools/encryption/hash");
    await wrapper.find("textarea").setValue("abc");
    await settle();

    const output = wrapper.find('textarea[aria-label*="SHA-256"]');
    const value = (output.element as HTMLTextAreaElement).value;
    expect(value).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("/tools/encryption/symmetric 对称加密页", () => {
  const plaintext = "猫娘工程师的机密喵～ 42";

  it("加密 → 解密 往返还原明文", async () => {
    const wrapper = await mountAt(SymmetricPage, "/tools/encryption/symmetric");
    await wrapper.find('input[type="password"]').setValue("hunter2");
    await wrapper.find("textarea").setValue(plaintext);

    await findButton(wrapper, "加密").trigger("click");
    await settle();

    const ciphertext = wrapper.find('textarea[aria-label="加密结果"]');
    const payload = (ciphertext.element as HTMLTextAreaElement).value;
    expect(payload.startsWith("v2:argon2id:AES-256-GCM:")).toBe(true);

    await wrapper
      .find('textarea[placeholder*="粘贴本工具生成的密文"]')
      .setValue(payload);
    await findButton(wrapper, "解密").trigger("click");
    await settle();

    const decrypted = wrapper.find('textarea[aria-label="解密结果"]');
    expect((decrypted.element as HTMLTextAreaElement).value).toBe(plaintext);
  });
});

describe("/tools/encryption/asymmetric 非对称加密页", () => {
  const plaintext = "公钥加密私钥解密喵～";

  it("生成密钥对 → 加密 → 解密 往返还原明文", async () => {
    const wrapper = await mountAt(AsymmetricPage, "/tools/encryption/asymmetric");

    await findButton(wrapper, "生成密钥对").trigger("click");
    await settle();

    // 公钥/私钥 PEM 生成并展示
    const publicPem = (wrapper.find('textarea[placeholder*="SPKI PEM"]').element as HTMLTextAreaElement).value;
    const privatePem = (wrapper.find('textarea[placeholder*="PKCS#8 PEM"]').element as HTMLTextAreaElement).value;
    expect(publicPem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(privatePem).toContain("-----BEGIN PRIVATE KEY-----");

    await wrapper.find('textarea[placeholder*="输入要加密的明文"]').setValue(plaintext);
    await findButton(wrapper, "加密").trigger("click");
    await settle();

    const ciphertext = wrapper.find('textarea[aria-label="公钥加密结果"]');
    const payload = (ciphertext.element as HTMLTextAreaElement).value;
    expect(payload.length).toBeGreaterThan(0);

    await wrapper
      .find('textarea[placeholder*="粘贴本工具生成的密文"]')
      .setValue(payload);
    await findButton(wrapper, "解密").trigger("click");
    await settle();

    const decrypted = wrapper.find('textarea[aria-label="私钥解密结果"]');
    expect((decrypted.element as HTMLTextAreaElement).value).toBe(plaintext);
  });
});

describe("/tools/encryption/hash 带盐与密钥算法", () => {
  it("HMAC-SHA256：输入密钥与消息后输出标准结果", async () => {
    const wrapper = await mountAt(HashPage, "/tools/encryption/hash");
    await wrapper.find("select").setValue("HMAC-SHA256");
    await settle();
    await wrapper.find('input[placeholder*="共享密钥"]').setValue("key");
    await wrapper.find("textarea").setValue("The quick brown fox jumps over the lazy dog");
    await settle();

    const output = wrapper.find('textarea[aria-label*="HMAC-SHA256"]');
    expect((output.element as HTMLTextAreaElement).value).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("PBKDF2-SHA256：密码 + 盐 + 迭代次数派生密钥", async () => {
    const wrapper = await mountAt(HashPage, "/tools/encryption/hash");
    await wrapper.find("select").setValue("PBKDF2-SHA256");
    await settle();
    await wrapper.find('input[placeholder*="要派生的密码"]').setValue("password");
    await wrapper.find('input[placeholder*="随机盐"]').setValue("salt");
    await wrapper.find('input[type="number"]').setValue("1");
    await settle();

    const output = wrapper.find('textarea[aria-label*="PBKDF2-SHA256"]');
    expect((output.element as HTMLTextAreaElement).value).toBe(
      "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b",
    );
  });
});

describe("/tools/encryption/asymmetric ECC 与后量子", () => {
  const plaintext = "新的算法也能往返喵～";

  it("ECDH-P-256：生成密钥 → 加密 → 解密 往返", async () => {
    const wrapper = await mountAt(AsymmetricPage, "/tools/encryption/asymmetric");
    await wrapper.find("select").setValue("ECDH-P-256");
    await settle();

    await findButton(wrapper, "生成密钥对").trigger("click");
    await settle();

    const publicPem = (wrapper.find('textarea[placeholder*="SPKI PEM"]').element as HTMLTextAreaElement).value;
    const privatePem = (wrapper.find('textarea[placeholder*="PKCS#8 PEM"]').element as HTMLTextAreaElement).value;
    expect(publicPem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(privatePem).toContain("-----BEGIN PRIVATE KEY-----");

    await wrapper.find('textarea[placeholder*="输入要加密的明文"]').setValue(plaintext);
    await findButton(wrapper, "加密").trigger("click");
    await settle();

    const payload = (wrapper.find('textarea[aria-label="公钥加密结果"]').element as HTMLTextAreaElement).value;
    expect(payload.startsWith("v1:ecdh:P-256:")).toBe(true);

    await wrapper.find('textarea[placeholder*="粘贴本工具生成的密文"]').setValue(payload);
    await findButton(wrapper, "解密").trigger("click");
    await settle();
    expect((wrapper.find('textarea[aria-label="私钥解密结果"]').element as HTMLTextAreaElement).value).toBe(plaintext);
  });

  it("ML-KEM-768（后量子）：生成密钥 → 加密 → 解密 往返", async () => {
    const wrapper = await mountAt(AsymmetricPage, "/tools/encryption/asymmetric");
    await wrapper.find("select").setValue("ML-KEM-768");
    await settle();

    await findButton(wrapper, "生成密钥对").trigger("click");
    await settle();

    const publicKey = (wrapper.find('textarea[placeholder*="base64 公钥"]').element as HTMLTextAreaElement).value;
    const privateKey = (wrapper.find('textarea[placeholder*="base64 私钥"]').element as HTMLTextAreaElement).value;
    expect(publicKey.length).toBeGreaterThan(0);
    expect(privateKey.length).toBeGreaterThan(0);

    await wrapper.find('textarea[placeholder*="输入要加密的明文"]').setValue(plaintext);
    await findButton(wrapper, "加密").trigger("click");
    await settle();

    const payload = (wrapper.find('textarea[aria-label="公钥加密结果"]').element as HTMLTextAreaElement).value;
    expect(payload.startsWith("v1:mlkem:ML-KEM-768:")).toBe(true);

    await wrapper.find('textarea[placeholder*="粘贴本工具生成的密文"]').setValue(payload);
    await findButton(wrapper, "解密").trigger("click");
    await settle();
    expect((wrapper.find('textarea[aria-label="私钥解密结果"]').element as HTMLTextAreaElement).value).toBe(plaintext);
  });
});

describe("/tools/encryption/hash 文件上传", () => {
  it("文件模式：上传文件后计算其 SHA-256 并展示文件名", async () => {
    const wrapper = await mountAt(HashPage, "/tools/encryption/hash");

    // 切换到文件模式
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("文件"))!
      .trigger("click");
    await settle();

    const fileInput = wrapper.find('input[aria-label="选择要处理的文件"]');
    const file = new File(["abc"], "hello.txt", { type: "text/plain" });
    Object.defineProperty(fileInput.element, "files", {
      value: [file],
      configurable: true,
    });
    await fileInput.trigger("change");
    await settle();

    expect(wrapper.text()).toContain("hello.txt");
    const output = wrapper.find('textarea[aria-label*="SHA-256"]');
    expect((output.element as HTMLTextAreaElement).value).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    // 移除文件后回到文本模式
    await wrapper.find('button[aria-label^="移除文件"]').trigger("click");
    await settle();
    expect(wrapper.text()).not.toContain("hello.txt");
  });
});


describe("/tools/encryption/symmetric 文件模式", () => {
  it("上传文件 → 加密 → 解密 还原明文", async () => {
    const wrapper = await mountAt(SymmetricPage, "/tools/encryption/symmetric");
    const plaintext = "文件加密内容喵～";

    // 切到文件模式并选择文件
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("文件"))!
      .trigger("click");
    await settle();
    const fileInput = wrapper.find('input[aria-label="选择要处理的文件"]');
    const file = new File([plaintext], "note.txt", { type: "text/plain" });
    Object.defineProperty(fileInput.element, "files", { value: [file], configurable: true });
    await fileInput.trigger("change");
    await settle();

    await wrapper.find('input[type="password"]').setValue("hunter2");
    await findButton(wrapper, "加密").trigger("click");
    await settle();

    const ciphertext = wrapper.find('textarea[aria-label="加密结果"]');
    const payload = (ciphertext.element as HTMLTextAreaElement).value;
    expect(payload.startsWith("v2:argon2id:AES-256-GCM:")).toBe(true);

    // 解密：粘贴密文，还原明文（文件模式也提供 UTF-8 预览）
    await wrapper.find('textarea[placeholder*="粘贴本工具生成的密文"]').setValue(payload);
    await findButton(wrapper, "解密").trigger("click");
    await settle();
    expect((wrapper.find('textarea[aria-label="解密结果"]').element as HTMLTextAreaElement).value).toBe(plaintext);
    // 下载按钮存在
    expect(wrapper.text()).toContain("下载");
  });
});

describe("/tools/encryption/asymmetric 文件模式", () => {
  it("ML-KEM-768 上传文件 → 加密 → 解密 还原明文", async () => {
    const wrapper = await mountAt(AsymmetricPage, "/tools/encryption/asymmetric");
    const plaintext = "非对称文件加密喵～";

    await wrapper.find("select").setValue("ML-KEM-768");
    await settle();
    await findButton(wrapper, "生成密钥对").trigger("click");
    await settle();

    // 切到文件模式并选择文件
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("文件"))!
      .trigger("click");
    await settle();
    const fileInput = wrapper.find('input[aria-label="选择要处理的文件"]');
    const file = new File([plaintext], "secret.txt", { type: "text/plain" });
    Object.defineProperty(fileInput.element, "files", { value: [file], configurable: true });
    await fileInput.trigger("change");
    await settle();

    await findButton(wrapper, "加密").trigger("click");
    await settle();

    const ciphertext = wrapper.find('textarea[aria-label="公钥加密结果"]');
    const payload = (ciphertext.element as HTMLTextAreaElement).value;
    expect(payload.startsWith("v1:mlkem:ML-KEM-768:")).toBe(true);

    await wrapper.find('textarea[placeholder*="粘贴本工具生成的密文"]').setValue(payload);
    await findButton(wrapper, "解密").trigger("click");
    await settle();
    expect((wrapper.find('textarea[aria-label="私钥解密结果"]').element as HTMLTextAreaElement).value).toBe(plaintext);
  });
});


describe("友好错误提示", () => {
  it("对称解密密码错误：显示友好提示而非原始报错", async () => {
    const wrapper = await mountAt(SymmetricPage, "/tools/encryption/symmetric");
    const payload = await symmetricEncrypt("AES-256-GCM", "机密内容", "right-password");

    await wrapper.find('input[type="password"]').setValue("wrong-password");
    await wrapper
      .find('textarea[placeholder*="粘贴本工具生成的密文"]')
      .setValue(payload);
    await findButton(wrapper, "解密").trigger("click");
    await settle();

    const text = wrapper.text();
    expect(text).toContain("解密失败：密码错误、密文被篡改或格式不正确");
    // 不直接输出底层报错（原始英文 / OperationError）
    expect(text).not.toMatch(/OperationError|Decryption failed|decrypt/i);
  });
});


describe("上传解密文件与密钥", () => {
  it("对称加密：上传密文文件后自动解密", async () => {
    const wrapper = await mountAt(SymmetricPage, "/tools/encryption/symmetric");
    const plaintext = "上传密文文件解密喵～";
    const payload = await symmetricEncrypt("AES-256-GCM", plaintext, "pw");

    await wrapper.find('input[type="password"]').setValue("pw");
    const up = wrapper.find('input[aria-label="上传密文文件"]');
    const file = new File([payload], "secret.enc", { type: "text/plain" });
    Object.defineProperty(up.element, "files", { value: [file], configurable: true });
    await up.trigger("change");
    await settle();

    expect(
      (wrapper.find('textarea[aria-label="解密结果"]').element as HTMLTextAreaElement).value,
    ).toBe(plaintext);
  });

  it("非对称：上传公钥/私钥文件与密文文件后解密", async () => {
    const wrapper = await mountAt(AsymmetricPage, "/tools/encryption/asymmetric");
    const plaintext = "密钥文件解密喵～";
    const pair = await generateKeyPairText("ML-KEM-768");
    const payload = await encryptWithPublicKey("ML-KEM-768", pair.publicKey, plaintext);

    // 切到 ML-KEM-768（密钥文本为 base64）
    await wrapper.find("select").setValue("ML-KEM-768");
    await settle();

    // 上传公钥文件
    const pubUp = wrapper.find('input[aria-label="上传公钥"]');
    Object.defineProperty(pubUp.element, "files", {
      value: [new File([pair.publicKey], "public-key.txt", { type: "text/plain" })],
      configurable: true,
    });
    await pubUp.trigger("change");
    await settle();
    expect(
      (wrapper.find('textarea[placeholder*="base64 公钥"]').element as HTMLTextAreaElement).value,
    ).toBe(pair.publicKey);

    // 上传私钥文件
    const privUp = wrapper.find('input[aria-label="上传私钥"]');
    Object.defineProperty(privUp.element, "files", {
      value: [new File([pair.privateKey], "private-key.txt", { type: "text/plain" })],
      configurable: true,
    });
    await privUp.trigger("change");
    await settle();

    // 上传密文文件 → 自动解密
    const ctUp = wrapper.find('input[aria-label="上传密文文件"]');
    Object.defineProperty(ctUp.element, "files", {
      value: [new File([payload], "secret.enc", { type: "text/plain" })],
      configurable: true,
    });
    await ctUp.trigger("change");
    await settle();

    expect(
      (wrapper.find('textarea[aria-label="私钥解密结果"]').element as HTMLTextAreaElement).value,
    ).toBe(plaintext);
  });
});

describe("转换工具页", () => {
  it("图片转换：渲染页面与文件选择入口", async () => {
    const wrapper = await mountAt(ImagePage, "/tools/conversion/image");
    expect(wrapper.text()).toContain("图片转换");
    expect(
      wrapper.find('input[aria-label="选择要处理的文件"]').exists(),
    ).toBe(true);
  });

  it("视频转换：WASM 引擎加载失败时展示不可用提示", async () => {
    const wrapper = await mountAt(VideoPage, "/tools/conversion/video");
    const fileInput = wrapper.find('input[aria-label="选择要处理的文件"]');
    const file = new File([new Uint8Array([1, 2, 3])], "sample.mp4", {
      type: "video/mp4",
    });
    Object.defineProperty(fileInput.element, "files", {
      value: [file],
      configurable: true,
    });
    await fileInput.trigger("change");
    await settle();

    await findButton(wrapper, "转换").trigger("click");
    await settle();

    // 组件测试禁用网络 → 引擎加载失败，应出现 WASM 不可用提示
    expect(wrapper.text()).toContain("WASM");
  });

  it("文档转换：Markdown → DOCX 时 WASM 引擎不可用给出提示", async () => {
    const wrapper = await mountAt(DocumentPage, "/tools/conversion/document");
    await wrapper.find("textarea").setValue("# 标题");
    await findButton(wrapper, "转换").trigger("click");
    await settle();

    expect(wrapper.text()).toContain("WASM");
  });
});
