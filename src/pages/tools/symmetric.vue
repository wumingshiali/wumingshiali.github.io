<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CircleHelp, KeyRound, Loader2, Lock, UnlockKeyhole } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import DownloadButton from "@/components/DownloadButton.vue";
import ModeToggle from "@/components/ModeToggle.vue";
import ToolFileInput from "@/components/ToolFileInput.vue";
import {
  symmetricAlgorithms,
  symmetricDecryptBytes,
  symmetricEncrypt,
  symmetricEncryptBytes,
  type SymmetricAlgorithm,
} from "@/lib/crypto/symmetric";
import { tryBytesToText } from "@/lib/crypto/utils";
import { friendlyError } from "@/lib/crypto/errors";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "对称加密",
  description:
    "在线对称加密工具：同一密码加解密，支持 AES-GCM / AES-CBC，文本与文件均可，浏览器本地运行。",
  path: "/tools/symmetric",
});

const algorithm = ref<SymmetricAlgorithm>("AES-256-GCM");
const password = ref("");
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
  symmetricAlgorithms.find((a) => a.id === algorithm.value)!,
);

/** 密文下载文件名：保留原文件名并追加 .enc 后缀 */
const encryptedFileName = computed(() =>
  file.value ? `${file.value.name}.enc` : "encrypted.enc",
);

async function handleEncrypt() {
  errorMessage.value = "";
  busy.value = true;
  try {
    if (mode.value === "file" && file.value) {
      const bytes = new Uint8Array(await file.value.arrayBuffer());
      ciphertext.value = await symmetricEncryptBytes(
        algorithm.value,
        bytes,
        password.value,
      );
    } else {
      ciphertext.value = await symmetricEncrypt(
        algorithm.value,
        plaintext.value,
        password.value,
      );
    }
    decryptedBytes.value = null;
    decryptedText.value = "";
  } catch (err) {
    errorMessage.value = friendlyError(err, "加密失败：请检查密码与输入内容");
  } finally {
    busy.value = false;
  }
}

async function handleDecrypt() {
  errorMessage.value = "";
  busy.value = true;
  try {
    const bytes = await symmetricDecryptBytes(
      decryptInput.value,
      password.value,
    );
    decryptedBytes.value = bytes;
    // 文本模式直接展示；文件模式也顺带提供 UTF-8 预览
    decryptedText.value = tryBytesToText(bytes) ?? "";
  } catch (err) {
    errorMessage.value = friendlyError(
      err,
      "解密失败：密码错误、密文被篡改或格式不正确",
    );
    decryptedBytes.value = null;
    decryptedText.value = "";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <ToolLayout
    title="对称加密"
    description="同一个密码既能加密也能解密，文本与文件都可以，全程本地计算喵～"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 算法 + 密码 -->
      <div class="flex flex-col gap-3 sm:flex-row">
        <label class="flex flex-1 flex-col gap-1.5">
          <span class="text-sm font-medium">加密算法</span>
          <select
            v-model="algorithm"
            class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option
              v-for="algo in symmetricAlgorithms"
              :key="algo.id"
              :value="algo.id"
            >
              {{ algo.label }}
            </option>
          </select>
        </label>
        <label class="flex flex-1 flex-col gap-1.5">
          <span class="text-sm font-medium">密码</span>
          <input
            v-model="password"
            type="password"
            autocomplete="off"
            placeholder="加解密使用同一个密码"
            class="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </label>
      </div>

      <Alert>
        <CircleHelp class="size-4" />
        <AlertDescription>
          {{ currentAlgo.note }}：密码经 PBKDF2-SHA256（15 万次迭代）拉伸为密钥，
          密文自带随机盐与 IV，同一原文每次结果都不同。
        </AlertDescription>
      </Alert>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>

      <!-- 加密 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <Lock class="size-4" />
          <h2 class="text-sm font-medium">加密</h2>
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
          :disabled="busy || !password || (mode === 'text' ? !plaintext : !file)"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleEncrypt"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <Lock v-else class="size-4" />
          {{ busy ? "处理中…" : "加密" }}
        </Button>
        <div v-if="ciphertext" class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-muted-foreground">密文（可复制或下载保存）</span>
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
            aria-label="加密结果"
          />
        </div>
      </section>

      <!-- 解密 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <UnlockKeyhole class="size-4" />
          <h2 class="text-sm font-medium">解密</h2>
        </div>
        <textarea
          v-model="decryptInput"
          rows="3"
          placeholder="粘贴本工具生成的密文…"
          class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-sans text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <Button
          type="button"
          variant="outline"
          :disabled="busy || !decryptInput || !password"
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
            aria-label="解密结果"
          />
          <p v-else class="text-xs text-muted-foreground">
            解密成功：内容为二进制，已提供下载（上方「下载」按钮）喵～
          </p>
        </div>
      </section>

      <Alert>
        <KeyRound class="size-4" />
        <AlertDescription>
          请妥善保管密码：密码遗失无法找回；CBC 模式无完整性校验，密码错误时可能解密出乱码。
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
