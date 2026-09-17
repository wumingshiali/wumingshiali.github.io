<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CircleHelp,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  UnlockKeyhole,
} from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import DownloadButton from "@/components/DownloadButton.vue";
import ModeToggle from "@/components/ModeToggle.vue";
import FileUploadButton from "@/components/FileUploadButton.vue";
import ToolFileInput from "@/components/ToolFileInput.vue";
import {
  asymmetricAlgorithms,
  decryptBytesWithPrivateKey,
  encryptBytesWithPublicKey,
  encryptWithPublicKey,
  generateKeyPairText,
  type AsymmetricAlgorithm,
} from "@/lib/crypto/asymmetric";
import { textToBytes, tryBytesToText } from "@/lib/crypto/utils";
import { friendlyError } from "@/lib/crypto/errors";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "非对称加密",
  description:
    "在线非对称加密工具：RSA-OAEP、ECC ECDH 混合加密、后量子 ML-KEM（FIPS 203），文本与文件均可，浏览器本地运行。",
  path: "/tools/asymmetric",
});

const algorithm = ref<AsymmetricAlgorithm>("RSA-OAEP-2048");
const publicKeyText = ref("");
const privateKeyText = ref("");
const plaintext = ref("");
const ciphertext = ref("");
const decryptInput = ref("");
const decryptedBytes = ref<Uint8Array<ArrayBuffer> | null>(null);
const decryptedText = ref("");
const busy = ref(false);
const errorMessage = ref("");
// 输入方式：文本 / 文件
const mode = ref<"text" | "file">("text");
const file = ref<File | null>(null);

const currentAlgo = computed(() =>
  asymmetricAlgorithms.find((a) => a.id === algorithm.value)!,
);

// 密钥文本是 base64 还是 PEM，由算法家族决定
const keyIsBase64 = computed(() => currentAlgo.value.family === "mlkem");

/** 密文下载文件名：保留原文件名并追加 .enc 后缀 */
const encryptedFileName = computed(() =>
  file.value ? `${file.value.name}.enc` : "encrypted.enc",
);

// 切换算法时清空旧密钥，避免误用不同家族的密钥
watch(algorithm, () => {
  publicKeyText.value = "";
  privateKeyText.value = "";
  ciphertext.value = "";
  decryptedBytes.value = null;
  decryptedText.value = "";
});

async function handleGenerate() {
  errorMessage.value = "";
  busy.value = true;
  try {
    const pair = await generateKeyPairText(algorithm.value);
    publicKeyText.value = pair.publicKey;
    privateKeyText.value = pair.privateKey;
    ciphertext.value = "";
    decryptedBytes.value = null;
    decryptedText.value = "";
  } catch (err) {
    errorMessage.value = friendlyError(err, "生成密钥对失败，请重试");
  } finally {
    busy.value = false;
  }
}

async function handleEncrypt() {
  errorMessage.value = "";
  // 仅 RSA 有明文长度上限（模长受限）；ECC / ML-KEM 混合加密走 AES-GCM 无限制
  const maxBytes = currentAlgo.value.maxPlaintextBytes;
  busy.value = true;
  try {
    if (mode.value === "file" && file.value) {
      const bytes = new Uint8Array(await file.value.arrayBuffer());
      if (maxBytes && bytes.length > maxBytes) {
        errorMessage.value = `文件过大：${currentAlgo.value.label} 单次最多加密 ${maxBytes} 字节，长文件请改用对称加密`;
        return;
      }
      ciphertext.value = await encryptBytesWithPublicKey(
        algorithm.value,
        publicKeyText.value,
        bytes,
      );
    } else {
      if (maxBytes && textToBytes(plaintext.value).length > maxBytes) {
        errorMessage.value = `明文过长：${currentAlgo.value.label} 单次最多加密 ${maxBytes} 字节（约 ${Math.floor(maxBytes / 3)} 个中文字符），长文本请改用对称加密`;
        return;
      }
      ciphertext.value = await encryptWithPublicKey(
        algorithm.value,
        publicKeyText.value,
        plaintext.value,
      );
    }
    decryptedBytes.value = null;
    decryptedText.value = "";
  } catch (err) {
    errorMessage.value = friendlyError(
      err,
      "加密失败：请检查公钥是否正确、内容是否过大",
    );
  } finally {
    busy.value = false;
  }
}

async function handleDecrypt() {
  errorMessage.value = "";
  busy.value = true;
  try {
    const bytes = await decryptBytesWithPrivateKey(
      algorithm.value,
      privateKeyText.value,
      decryptInput.value,
    );
    decryptedBytes.value = bytes;
    decryptedText.value = tryBytesToText(bytes) ?? "";
  } catch (err) {
    errorMessage.value = friendlyError(
      err,
      "解密失败：请检查私钥是否与公钥匹配、密文是否完整",
    );
    decryptedBytes.value = null;
    decryptedText.value = "";
  } finally {
    busy.value = false;
  }
}

/** 上传公钥 / 私钥文件：读为文本后填入对应输入框 */
function onPublicKeyLoaded(text: string) {
  publicKeyText.value = text;
  ciphertext.value = "";
  decryptedBytes.value = null;
  decryptedText.value = "";
}

function onPrivateKeyLoaded(text: string) {
  privateKeyText.value = text;
  decryptedBytes.value = null;
  decryptedText.value = "";
}

/** 上传密文文件：读为文本后自动解密（私钥已填时） */
async function onCiphertextLoaded(text: string) {
  decryptInput.value = text;
  errorMessage.value = "";
  if (privateKeyText.value) {
    await handleDecrypt();
  }
}
</script>

<template>
  <ToolLayout
    title="非对称加密"
    description="公钥加密、私钥解密：RSA / ECC / 后量子 ML-KEM，文本与文件都可以喵～"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 算法选择 + 生成 -->
      <div class="flex flex-col gap-3 sm:flex-row">
        <label class="flex flex-1 flex-col gap-1.5">
          <span class="text-sm font-medium">加密算法</span>
          <select
            v-model="algorithm"
            class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <optgroup label="RSA（经典）">
              <option v-for="algo in asymmetricAlgorithms.filter((a) => a.family === 'rsa')" :key="algo.id" :value="algo.id">
                {{ algo.label }}
              </option>
            </optgroup>
            <optgroup label="ECC（椭圆曲线）">
              <option v-for="algo in asymmetricAlgorithms.filter((a) => a.family === 'ecdh')" :key="algo.id" :value="algo.id">
                {{ algo.label }}
              </option>
            </optgroup>
            <optgroup label="后量子（抗量子攻击）">
              <option v-for="algo in asymmetricAlgorithms.filter((a) => a.family === 'mlkem')" :key="algo.id" :value="algo.id">
                {{ algo.label }}
              </option>
            </optgroup>
          </select>
        </label>
        <div class="flex items-end">
          <Button
            type="button"
            :disabled="busy"
            class="h-10 w-full border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80 sm:w-auto"
            @click="handleGenerate"
          >
            <Loader2 v-if="busy" class="size-4 animate-spin" />
            <RefreshCw v-else class="size-4" />
            {{ busy ? "生成中…" : "生成密钥对" }}
          </Button>
        </div>
      </div>

      <!-- 密钥用途说明：加密密钥 vs GitHub 签名密钥 -->
      <Alert>
        <CircleHelp class="size-4" />
        <AlertDescription>
          密钥用途说明：这里生成的是<strong>加密密钥</strong>（公钥加密 / 私钥解密），仅在本工具内互通使用。
          GitHub 登录与提交用的 SSH / GPG 是<strong>签名密钥</strong>，格式与用途不同，不能直接混用。
          RSA 与 ECC 广泛兼容；后量子 ML-KEM（Kyber，FIPS 203）是新一代标准，GitHub / SSH / TLS 目前尚未支持，仅作实验用途。
        </AlertDescription>
      </Alert>

      <!-- 公钥 / 私钥 -->
      <div class="grid w-full gap-3 sm:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium">公钥</span>
            <div class="flex items-center gap-2">
              <FileUploadButton
                label="上传公钥"
                accept=".pem,.txt,.key,text/plain"
                @loaded="onPublicKeyLoaded"
              />
              <DownloadButton
                :filename="keyIsBase64 ? 'public-key.txt' : 'public-key.pem'"
                :data="publicKeyText"
                :disabled="!publicKeyText"
              />
              <CopyButton :text="publicKeyText" :disabled="!publicKeyText" />
            </div>
          </div>
          <textarea
            v-model="publicKeyText"
            rows="7"
            :placeholder="keyIsBase64 ? '点击上方生成，或粘贴 base64 公钥…' : '点击上方生成，或粘贴 SPKI PEM…'"
            spellcheck="false"
            class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </label>
        <label class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium">私钥</span>
            <div class="flex items-center gap-2">
              <FileUploadButton
                label="上传私钥"
                accept=".pem,.txt,.key,text/plain"
                @loaded="onPrivateKeyLoaded"
              />
              <DownloadButton
                :filename="keyIsBase64 ? 'private-key.txt' : 'private-key.pem'"
                :data="privateKeyText"
                :disabled="!privateKeyText"
              />
              <CopyButton :text="privateKeyText" :disabled="!privateKeyText" />
            </div>
          </div>
          <textarea
            v-model="privateKeyText"
            rows="7"
            :placeholder="keyIsBase64 ? '点击上方生成，或粘贴 base64 私钥…' : '点击上方生成，或粘贴 PKCS#8 PEM…'"
            spellcheck="false"
            class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </label>
      </div>

      <!-- 家族说明 -->
      <Alert v-if="currentAlgo.family === 'rsa'">
        <CircleHelp class="size-4" />
        <AlertDescription>
          {{ currentAlgo.label }} 单次最多加密 {{ currentAlgo.maxPlaintextBytes }}
          字节（约 {{ Math.floor((currentAlgo.maxPlaintextBytes as number) / 3) }} 个中文字符），
          长文本 / 大文件建议先用对称加密、再加密对称密钥（混合加密）。
        </AlertDescription>
      </Alert>
      <Alert v-else-if="currentAlgo.family === 'ecdh'">
        <CircleHelp class="size-4" />
        <AlertDescription>
          ECC 混合加密：临时 ECDH 密钥协商会话密钥，经 HKDF 派生 AES-256-GCM
          密钥加密消息；会话密钥不直接传输，文件大小无限制。
        </AlertDescription>
      </Alert>
      <Alert v-else>
        <CircleHelp class="size-4" />
        <AlertDescription>
          {{ currentAlgo.label }}：NIST 后量子标准（FIPS 203），ML-KEM
          封装会话密钥 + AES-256-GCM 加密消息，可抵抗量子计算机攻击；文件大小无限制。
        </AlertDescription>
      </Alert>

      <Alert>
        <KeyRound class="size-4" />
        <AlertDescription>
          私钥等同身份凭证，请务必离线保管、不要分享；公钥可以随意分发。
        </AlertDescription>
      </Alert>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>

      <!-- 加密 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <Lock class="size-4" />
          <h2 class="text-sm font-medium">用公钥加密</h2>
        </div>
        <ModeToggle v-model="mode" />
        <Transition name="tool-mode" mode="out-in">
          <textarea
            v-if="mode === 'text'"
            key="text"
            v-model="plaintext"
            rows="4"
            placeholder="输入要加密的明文…"
            class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          <ToolFileInput
            v-else
            key="file"
            v-model="file"
            hint="文件在本机加密，不会上传；密文为文本，可复制或下载保存"
          />
        </Transition>
        <Button
          type="button"
          :disabled="busy || !publicKeyText || (mode === 'text' ? !plaintext : !file)"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleEncrypt"
        >
          <Lock class="size-4" />
          加密
        </Button>
        <div v-if="ciphertext" class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted-foreground">密文（自描述格式）</span>
            <div class="flex items-center gap-2">
              <DownloadButton :filename="encryptedFileName" :data="ciphertext" />
              <CopyButton :text="ciphertext" />
            </div>
          </div>
          <textarea
            :value="ciphertext"
            rows="3"
            readonly
            class="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs leading-relaxed outline-none"
            aria-label="公钥加密结果"
          />
        </div>
      </section>

      <!-- 解密 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <UnlockKeyhole class="size-4" />
          <h2 class="text-sm font-medium">用私钥解密</h2>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">密文（可粘贴或上传 .enc 文件）</span>
          <FileUploadButton label="上传密文文件" accept=".enc,.txt,text/plain" @loaded="onCiphertextLoaded" />
        </div>
        <textarea
          v-model="decryptInput"
          rows="3"
          placeholder="粘贴本工具生成的密文，或点击上方上传文件…"
          spellcheck="false"
          class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <Button
          type="button"
          variant="outline"
          :disabled="busy || !decryptInput || !privateKeyText"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleDecrypt"
        >
          <UnlockKeyhole class="size-4" />
          解密
        </Button>
        <div v-if="decryptedBytes" class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted-foreground">明文</span>
            <div class="flex items-center gap-2">
              <DownloadButton filename="decrypted.bin" :data="decryptedBytes" />
              <CopyButton v-if="decryptedText" :text="decryptedText" />
            </div>
          </div>
          <textarea
            v-if="decryptedText"
            :value="decryptedText"
            rows="3"
            readonly
            class="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 font-sans text-sm leading-relaxed outline-none"
            aria-label="私钥解密结果"
          />
          <p v-else class="text-xs text-muted-foreground">
            解密成功：内容为二进制，已提供下载（上方「下载」按钮）喵～
          </p>
        </div>
      </section>
    </div>
  </ToolLayout>
</template>
