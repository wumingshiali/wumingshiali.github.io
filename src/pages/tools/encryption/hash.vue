<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CircleHelp, Dices, Fingerprint } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import ModeToggle from "@/components/ModeToggle.vue";
import ToolFileInput from "@/components/ToolFileInput.vue";
import {
  hashAlgorithms,
  hashBytes,
  hashText,
  type HashAlgorithm,
} from "@/lib/crypto/hash";
import { bytesToHex, randomBytes } from "@/lib/crypto/utils";
import { friendlyError } from "@/lib/crypto/errors";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "单向加密",
  description:
    "在线哈希与加盐派生工具：MD5、SHA-1/256/384/512、HMAC、PBKDF2、scrypt，支持文本与文件，浏览器本地计算。",
  path: "/tools/encryption/hash",
});

const algorithm = ref<HashAlgorithm>("SHA-256");
const input = ref("");
const secret = ref("");
const salt = ref("");
const iterations = ref(100_000);
const scryptN = ref(16_384);
const scryptR = ref(8);
const scryptP = ref(1);
const output = ref("");
const errorMessage = ref("");
const computing = ref(false);
// 输入方式：文本 / 文件（密码派生算法仅支持文本）
const mode = ref<"text" | "file">("text");
const file = ref<File | null>(null);

const currentAlgo = computed(() =>
  hashAlgorithms.find((a) => a.id === algorithm.value)!,
);

/** 文件模式仅对散列与 HMAC 可用；密码派生算法自动回到文本模式 */
const fileModeSupported = computed(() => !currentAlgo.value.needsPassword);

/** 生成随机盐（16 字节 → 十六进制），一键填入 */
function randomSalt() {
  salt.value = bytesToHex(randomBytes(16));
}

// 切换到密码派生算法时退出文件模式
watch(algorithm, () => {
  if (!fileModeSupported.value && mode.value === "file") {
    file.value = null;
    mode.value = "text";
  }
});

let timer: ReturnType<typeof setTimeout> | undefined;

/** 输入变化后防抖计算（KDF 有一定耗时，防抖避免连续按键重复计算） */
watch(
  [algorithm, input, secret, salt, iterations, scryptN, scryptR, scryptP, mode, file],
  async () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      computing.value = true;
      try {
        if (mode.value === "file" && file.value) {
          // 文件模式：对文件字节计算散列 / HMAC
          const bytes = new Uint8Array(await file.value.arrayBuffer());
          output.value = await hashBytes(algorithm.value, bytes, {
            secret: currentAlgo.value.needsKey ? secret.value : undefined,
          });
        } else {
          // 文本模式：密码派生类算法（PBKDF2 / scrypt）把密码作为 text 传入；
          // HMAC 把消息作为 text、密钥放 options.secret
          const message = currentAlgo.value.needsPassword
            ? secret.value
            : input.value;
          output.value = await hashText(algorithm.value, message, {
            secret: currentAlgo.value.needsKey ? secret.value : undefined,
            salt: salt.value,
            iterations: iterations.value,
            scryptN: scryptN.value,
            scryptR: scryptR.value,
            scryptP: scryptP.value,
          });
        }
        errorMessage.value = "";
      } catch (err) {
        output.value = "";
        errorMessage.value = friendlyError(err, "计算失败，请检查输入是否正确");
      } finally {
        computing.value = false;
      }
    }, 150);
  },
  { immediate: true },
);
</script>

<template>
  <ToolLayout
    title="单向加密"
    back-to="/tools/encryption" back-label="返回加密工具"
    description="输入文本或上传文件，实时计算不可逆结果，全程本地计算喵～"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 算法选择 -->
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">加密算法</span>
        <select
          v-model="algorithm"
          class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          <optgroup label="散列摘要">
            <option v-for="algo in hashAlgorithms.filter((a) => !a.needsKey && !a.needsPassword)" :key="algo.id" :value="algo.id">
              {{ algo.label }}
            </option>
          </optgroup>
          <optgroup label="密钥散列（HMAC）">
            <option v-for="algo in hashAlgorithms.filter((a) => a.needsKey)" :key="algo.id" :value="algo.id">
              {{ algo.label }}
            </option>
          </optgroup>
          <optgroup label="加盐密码派生">
            <option v-for="algo in hashAlgorithms.filter((a) => a.needsPassword)" :key="algo.id" :value="algo.id">
              {{ algo.label }}
            </option>
          </optgroup>
        </select>
      </label>

      <!-- 输入方式切换（密码派生算法仅文本）+ 模式动画 -->
      <ModeToggle v-if="fileModeSupported" v-model="mode" />
      <Transition name="tool-mode" mode="out-in">
        <label
          v-if="mode === 'text' && !currentAlgo.needsPassword"
          key="text"
          class="flex flex-col gap-1.5"
        >
          <span class="text-sm font-medium">
            {{ currentAlgo.needsKey ? "消息" : "原文" }}
          </span>
          <textarea
            v-model="input"
            rows="4"
            :placeholder="currentAlgo.needsKey ? '输入要计算 HMAC 的消息…' : '在这里输入要计算摘要的文本…'"
            class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </label>
        <div v-else-if="mode === 'file'" key="file" class="flex flex-col gap-2">
          <ToolFileInput
            v-model="file"
            hint="文件在本机计算，不会上传；支持散列与 HMAC"
          />
        </div>
      </Transition>

      <!-- 密钥 / 密码 -->
      <label v-if="currentAlgo.needsKey || currentAlgo.needsPassword" class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">
          {{ currentAlgo.needsKey ? "密钥" : "密码" }}
        </span>
        <input
          v-model="secret"
          :type="currentAlgo.needsKey ? 'text' : 'password'"
          autocomplete="off"
          :placeholder="currentAlgo.needsKey ? 'HMAC 的共享密钥（文件模式同样适用）' : '要派生的密码'"
          class="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </label>

      <!-- 盐值 -->
      <div v-if="currentAlgo.needsSalt" class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">盐值</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
            @click="randomSalt"
          >
            <Dices class="size-4" />
            随机盐
          </Button>
        </div>
        <input
          v-model="salt"
          type="text"
          autocomplete="off"
          placeholder="同一密码加不同盐，结果完全不同；建议使用随机盐"
          class="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </div>

      <!-- PBKDF2 迭代次数 -->
      <label v-if="currentAlgo.needsIterations" class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">迭代次数</span>
        <input
          v-model.number="iterations"
          type="number"
          min="1"
          step="1000"
          class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </label>

      <!-- scrypt 参数 -->
      <div v-if="currentAlgo.needsScryptParams" class="grid gap-3 sm:grid-cols-3">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">内存成本 N</span>
          <select
            v-model.number="scryptN"
            class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option :value="16384">2¹⁴ (16K)</option>
            <option :value="32768">2¹⁵ (32K)</option>
            <option :value="65536">2¹⁶ (64K)</option>
            <option :value="131072">2¹⁷ (128K)</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">块大小 r</span>
          <input
            v-model.number="scryptR"
            type="number"
            min="1"
            class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">并行度 p</span>
          <input
            v-model.number="scryptP"
            type="number"
            min="1"
            class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </label>
      </div>

      <!-- 输出 -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">
            {{ currentAlgo.needsKey || currentAlgo.needsPassword ? "结果" : "摘要" }}
          </span>
          <CopyButton :text="output" :disabled="!output" />
        </div>
        <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
          {{ errorMessage }}
        </p>
        <textarea
          :value="output"
          rows="3"
          readonly
          class="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm leading-relaxed outline-none"
          :aria-label="`${currentAlgo.label} 结果`"
        />
      </div>

      <!-- 安全提示 -->
      <Alert v-if="currentAlgo.id === 'MD5' || currentAlgo.id === 'SHA-1'">
        <Fingerprint class="size-4" />
        <AlertDescription>
          MD5 与 SHA-1 已被证明可碰撞，仅用于兼容旧系统；新场景请选
          SHA-256 及以上喵～
        </AlertDescription>
      </Alert>
      <Alert v-if="currentAlgo.needsSalt">
        <CircleHelp class="size-4" />
        <AlertDescription>
          {{ currentAlgo.label }} 适合存储密码指纹：每次用随机盐派生，同一密码结果也不同；
          生产环境建议 scrypt 且 N ≥ 2¹⁵、迭代次数尽量高。
        </AlertDescription>
      </Alert>
      <Alert v-else>
        <CircleHelp class="size-4" />
        <AlertDescription>
          哈希不可逆：文本适合校验内容，文件适合校验下载完整性；存储密码请用
          PBKDF2 / scrypt / argon2 等加盐算法，避免裸 SHA 被彩虹表破解。
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
