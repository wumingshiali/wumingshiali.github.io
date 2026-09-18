<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, Video as VideoIcon, WifiOff } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import ToolFileInput from "@/components/ToolFileInput.vue";
import DownloadButton from "@/components/DownloadButton.vue";
import {
  convertVideo,
  loadFFmpeg,
  videoPresets,
} from "@/lib/conversion/video";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "视频转换",
  description:
    "在线视频 / 音频格式转换：MP4 / WebM / MKV / GIF 与音频提取，ffmpeg.wasm 本地转码。",
  path: "/tools/conversion/video",
});

const file = ref<File | null>(null);
const presetId = ref("mp4");
const busy = ref(false);
const loadingEngine = ref(false);
const progress = ref(0);
const errorMessage = ref("");
const resultBytes = ref<Uint8Array<ArrayBuffer> | null>(null);
const resultName = ref("");

const currentPreset = computed(
  () => videoPresets.find((p) => p.id === presetId.value)!,
);

/** WASM 加载失败时展示独立提示（区别于普通错误） */
const wasmUnavailable = computed(() => errorMessage.value.includes("WASM"));

/** ffmpeg 需要带扩展名的输入文件名才能识别格式 */
function safeInputName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "mp4";
  return `input.${ext}`;
}

async function handleConvert() {
  if (!file.value) return;
  errorMessage.value = "";
  resultBytes.value = null;
  progress.value = 0;
  busy.value = true;
  let ffmpeg: Awaited<ReturnType<typeof loadFFmpeg>> | undefined;
  try {
    loadingEngine.value = true;
    ffmpeg = await loadFFmpeg();
    loadingEngine.value = false;
    // 进度事件只在 exec 期间触发，加载完成后注册即可
    ffmpeg.on("progress", ({ progress: ratio }) => {
      progress.value = ratio;
    });
    const { bytes, outputName } = await convertVideo(
      file.value,
      currentPreset.value,
      safeInputName(file.value.name),
    );
    resultBytes.value = bytes;
    resultName.value = outputName;
    progress.value = 1;
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "转换失败，请重试";
  } finally {
    loadingEngine.value = false;
    busy.value = false;
  }
}
</script>

<template>
  <ToolLayout
    title="视频转换"
    description="MP4 / WebM / MKV / GIF 互转与音频提取，ffmpeg.wasm 本地转码喵～"
    back-to="/tools/conversion"
    back-label="返回转换工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 选择文件 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <VideoIcon class="size-4" />
          <h2 class="text-sm font-medium">选择文件</h2>
        </div>
        <ToolFileInput
          v-model="file"
          accept="video/*,audio/*"
          hint="视频 / 音频在本机转码，不会上传"
        />
      </section>

      <!-- 输出格式 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">输出格式</span>
          <select
            v-model="presetId"
            class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option v-for="p in videoPresets" :key="p.id" :value="p.id">
              {{ p.label }}{{ p.note ? `（${p.note}）` : "" }}
            </option>
          </select>
        </label>
        <Button
          type="button"
          :disabled="busy || !file"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleConvert"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <VideoIcon v-else class="size-4" />
          {{ busy ? (loadingEngine ? "正在加载 WASM 引擎…" : "转码中…") : "转换" }}
        </Button>
        <p v-if="loadingEngine" class="text-xs text-muted-foreground">
          首次使用需从 CDN 下载约 30MB 转换引擎，请耐心等待喵～
        </p>

        <!-- 进度条 -->
        <div v-if="busy && !loadingEngine" class="flex flex-col gap-1">
          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-200"
              :style="{ width: `${Math.round(progress * 100)}%` }"
            />
          </div>
          <span class="text-xs text-muted-foreground">
            转码进度：{{ Math.round(progress * 100) }}%
          </span>
        </div>
      </section>

      <p v-if="errorMessage && !wasmUnavailable" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>

      <!-- WASM 不可用提示 -->
      <Alert v-if="wasmUnavailable">
        <WifiOff class="size-4" />
        <AlertDescription class="flex flex-col gap-2">
          <span>{{ errorMessage }}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-fit border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
            @click="handleConvert"
          >
            <RefreshCw class="size-4" />
            重试
          </Button>
        </AlertDescription>
      </Alert>

      <!-- 结果 -->
      <div v-if="resultBytes" class="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <span class="truncate text-sm font-medium">{{ resultName }}</span>
        <DownloadButton :filename="resultName" :data="resultBytes" />
      </div>

      <Alert>
        <VideoIcon class="size-4" />
        <AlertDescription>
          转码引擎（ffmpeg.wasm）按需从 CDN 加载，文件不上传，全程本地处理；若加载失败请检查网络后重试。
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
