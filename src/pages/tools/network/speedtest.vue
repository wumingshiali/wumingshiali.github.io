<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gauge, Info, Loader2, Zap } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import {
  DEFAULT_DOWNLOAD_URLS,
  DEFAULT_UPLOAD_URLS,
  downloadSpeed,
  uploadSpeed,
  type SpeedProgress,
} from "@/lib/network/speedtest";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "本地测速",
  description:
    "浏览器本地测速：下载 / 上传速度测试，实时进度与吞吐统计。",
  path: "/tools/network/speedtest",
});

type Mode = "download" | "upload";

const mode = ref<Mode>("download");
const url = ref(DEFAULT_DOWNLOAD_URLS[0].url);
const busy = ref(false);
const errorMessage = ref("");
const progress = ref(0);
const progressMbps = ref(0);
const received = ref(0);
const result = ref<{ bytes: number; ms: number; mbps: number } | null>(null);

const isDownload = computed(() => mode.value === "download");

function switchMode(m: Mode) {
  mode.value = m;
  url.value = m === "download" ? DEFAULT_DOWNLOAD_URLS[0].url : DEFAULT_UPLOAD_URLS[0].url;
  reset();
}

function reset() {
  errorMessage.value = "";
  progress.value = 0;
  progressMbps.value = 0;
  received.value = 0;
  result.value = null;
}

function pickPreset(presetUrl: string) {
  url.value = presetUrl;
  reset();
}

function onProgress(p: SpeedProgress) {
  received.value = p.receivedBytes;
  progressMbps.value = p.mbps;
  // 进度按 100MB 满刻度近似
  progress.value = Math.min(100, (p.receivedBytes / (100 * 1024 * 1024)) * 100);
}

async function handleStart() {
  errorMessage.value = "";
  result.value = null;
  progress.value = 0;
  progressMbps.value = 0;
  received.value = 0;
  if (!url.value.trim()) {
    errorMessage.value = "请输入测速 URL";
    return;
  }
  busy.value = true;
  try {
    if (isDownload.value) {
      const r = await downloadSpeed(url.value.trim(), onProgress);
      result.value = r;
      progress.value = 100;
    } else {
      const r = await uploadSpeed(url.value.trim(), 8 * 1024 * 1024);
      result.value = r;
      progress.value = 100;
    }
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "测速失败，请确认 URL 可访问且支持跨域";
  } finally {
    busy.value = false;
  }
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
</script>

<template>
  <ToolLayout
    title="本地测速"
    description="浏览器本地下载 / 上传测速，实时进度喵～"
    back-to="/tools/network"
    back-label="返回网络工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex gap-1 rounded-xl border border-border bg-muted/60 p-1" role="tablist" aria-label="测速方向">
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'download'"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="mode === 'download' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="switchMode('download')"
          >
            <Gauge class="size-4" />
            下载测速
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'upload'"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="mode === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="switchMode('upload')"
          >
            <Zap class="size-4" />
            上传测速
          </button>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">{{ isDownload ? "下载测速 URL" : "上传测速 URL" }}</span>
          <input
            v-model="url"
            type="url"
            spellcheck="false"
            placeholder="https://example.com/large-file.bin"
            class="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="preset in isDownload ? DEFAULT_DOWNLOAD_URLS : DEFAULT_UPLOAD_URLS"
              :key="preset.label"
              type="button"
              variant="outline"
              size="sm"
              class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
              @click="pickPreset(preset.url)"
            >
              {{ preset.label }}
            </Button>
          </div>
        </div>

        <Button
          type="button"
          :disabled="busy || !url.trim()"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleStart"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <Gauge v-else class="size-4" />
          {{ busy ? "测速中…" : "开始测速" }}
        </Button>

        <!-- 进度 -->
        <div v-if="busy" class="flex flex-col gap-1">
          <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-200"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <span class="text-xs text-muted-foreground">
            {{ isDownload ? `已下载 ${fmtBytes(received)}` : "上传中…" }}
            <template v-if="progressMbps">｜实时 {{ progressMbps.toFixed(1) }} Mbps</template>
          </span>
        </div>
      </section>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>

      <section v-if="result" class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">测速结果</span>
          <span class="text-2xl font-semibold tracking-tight">
            {{ result.mbps.toFixed(2) }}
            <span class="text-sm font-normal text-muted-foreground">Mbps</span>
          </span>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ fmtBytes(result.bytes) }} / {{ (result.ms / 1000).toFixed(2) }} s
          {{ isDownload ? "（下载）" : "（上传）" }}
        </p>
      </section>

      <Alert>
        <Info class="size-4" />
        <AlertDescription>
          下载测速需目标支持跨域（CORS）才能读取数据流；上传测速通过 no-cors 发送数据块计时。
          结果受本地网络、目标服务端带宽影响，仅供参考喵～
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
