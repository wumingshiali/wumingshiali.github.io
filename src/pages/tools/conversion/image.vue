<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Image as ImageIcon, Loader2 } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import ToolFileInput from "@/components/ToolFileInput.vue";
import DownloadButton from "@/components/DownloadButton.vue";
import {
  convertImage,
  imageFormats,
  imageOutputName,
} from "@/lib/conversion/image";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "图片转换",
  description:
    "在线图片格式转换：PNG / JPEG / WebP / AVIF / BMP 互转，浏览器原生 Canvas 处理，无需 WASM。",
  path: "/tools/conversion/image",
});

const file = ref<File | null>(null);
const formatId = ref("png");
const quality = ref(0.9);
const busy = ref(false);
const errorMessage = ref("");
const infoMessage = ref("");
const resultBytes = ref<Uint8Array<ArrayBuffer> | null>(null);
const resultName = ref("");
const previewUrl = ref("");

const currentFormat = computed(
  () => imageFormats.find((f) => f.id === formatId.value)!,
);

// 卸载时释放预览 URL，避免内存泄漏
onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});

/** 输出文件名：保留原文件主名 */
watch(
  file,
  async (value) => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
    resultBytes.value = null;
    infoMessage.value = "";
    if (value) previewUrl.value = URL.createObjectURL(value);
  },
  { immediate: true },
);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleConvert() {
  if (!file.value) return;
  errorMessage.value = "";
  infoMessage.value = "";
  busy.value = true;
  try {
    const { blob, width, height } = await convertImage(
      file.value,
      currentFormat.value,
      quality.value,
    );
    resultBytes.value = new Uint8Array(await blob.arrayBuffer());
    resultName.value = imageOutputName(file.value.name, currentFormat.value);
    infoMessage.value = `转换成功：${width}×${height} → ${currentFormat.value.label}（${formatSize(blob.size)}）喵～`;
  } catch (err) {
    resultBytes.value = null;
    errorMessage.value =
      err instanceof Error ? err.message : "转换失败，请检查图片是否受支持";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <ToolLayout
    title="图片转换"
    description="PNG / JPEG / WebP / AVIF / BMP 互转，浏览器原生处理，无需 WASM 喵～"
    back-to="/tools/conversion"
    back-label="返回转换工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 选择图片 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <ImageIcon class="size-4" />
          <h2 class="text-sm font-medium">选择图片</h2>
        </div>
        <ToolFileInput
          v-model="file"
          accept="image/*"
          hint="图片在本机转换，不会上传；支持 PNG / JPEG / WebP / GIF / BMP / AVIF 等"
        />
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="待转换图片预览"
          class="max-h-64 w-auto rounded-lg border border-border object-contain"
        />
      </section>

      <!-- 输出格式 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex flex-col gap-3 sm:flex-row">
          <label class="flex flex-1 flex-col gap-1.5">
            <span class="text-sm font-medium">输出格式</span>
            <select
              v-model="formatId"
              class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option v-for="f in imageFormats" :key="f.id" :value="f.id">
                {{ f.label }}{{ f.note ? `（${f.note}）` : "" }}
              </option>
            </select>
          </label>
          <label v-if="currentFormat.lossy" class="flex flex-1 flex-col gap-1.5">
            <span class="text-sm font-medium">质量：{{ Math.round(quality * 100) }}%</span>
            <input
              v-model.number="quality"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              class="h-10 w-full"
            />
          </label>
        </div>
        <Button
          type="button"
          :disabled="busy || !file"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleConvert"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <ImageIcon v-else class="size-4" />
          {{ busy ? "转换中…" : "转换" }}
        </Button>
      </section>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="infoMessage" class="text-sm text-emerald-600 dark:text-emerald-400">
        {{ infoMessage }}
      </p>

      <!-- 结果 -->
      <div v-if="resultBytes" class="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <span class="truncate text-sm font-medium">{{ resultName }}</span>
        <DownloadButton :filename="resultName" :data="resultBytes" />
      </div>

      <Alert>
        <ImageIcon class="size-4" />
        <AlertDescription>
          图片转换使用浏览器内置 Canvas，无需下载 WASM 引擎，全程本地处理喵～
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
