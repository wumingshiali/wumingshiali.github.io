<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Info, Loader2 } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import { pingHosts, type PingStats } from "@/lib/network/ping";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "本地 Ping",
  description:
    "浏览器本地 Ping：HTTP 时延测量与丢包统计，支持批量目标与多样本。",
  path: "/tools/network/ping",
});

const input = ref("");
const sampleCount = ref(4);
const busy = ref(false);
const results = ref<PingStats[]>([]);
const errorMessage = ref("");

const SAMPLE = `baidu.com
github.com
cloudflare.com`;

const busyCount = computed(() => input.value.split(/\r?\n/).filter((s) => s.trim()).length);

function fillSample() {
  input.value = SAMPLE;
  results.value = [];
  errorMessage.value = "";
}

async function handlePing() {
  errorMessage.value = "";
  results.value = [];
  const targets = input.value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!targets.length) {
    errorMessage.value = "请输入至少一个目标（域名或 URL）";
    return;
  }
  busy.value = true;
  try {
    results.value = await pingHosts(targets, sampleCount.value);
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : "Ping 失败";
  } finally {
    busy.value = false;
  }
}

function fmt(ms: number): string {
  return `${ms.toFixed(0)} ms`;
}
</script>

<template>
  <ToolLayout
    title="本地 Ping"
    description="HTTP 时延近似 Ping：统计最小 / 平均 / 最大与丢包，支持批量喵～"
    back-to="/tools/network"
    back-label="返回网络工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <Activity class="size-4" />
            <h2 class="text-sm font-medium">目标（每行一个，域名或 URL）</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
            @click="fillSample"
          >
            填入示例
          </Button>
        </div>
        <textarea
          v-model="input"
          rows="4"
          placeholder="每行一个域名或 URL，例如：&#10;baidu.com&#10;github.com"
          class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <label class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">每目标样本数</span>
          <select
            v-model.number="sampleCount"
            class="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option :value="1">1</option>
            <option :value="4">4</option>
            <option :value="8">8</option>
          </select>
        </label>
        <Button
          type="button"
          :disabled="busy || !input.trim()"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handlePing"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <Activity v-else class="size-4" />
          {{ busy ? `Ping 中…（${busyCount} 个目标）` : "开始 Ping" }}
        </Button>
      </section>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>

      <section v-if="results.length" class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <span class="text-sm font-medium">结果</span>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="stat in results"
            :key="stat.url"
            class="rounded-xl border border-border bg-background px-3 py-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-mono text-sm">{{ stat.url }}</span>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="stat.lossRate >= 0.5 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
              >
                {{ stat.lossRate >= 0.5 ? "不可达" : "正常" }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>最小 {{ fmt(stat.min) }}</span>
              <span>平均 {{ fmt(stat.avg) }}</span>
              <span>最大 {{ fmt(stat.max) }}</span>
              <span>丢包 {{ stat.loss }}/{{ sampleCount }}（{{ Math.round(stat.lossRate * 100) }}%）</span>
            </div>
          </div>
        </div>
      </section>

      <Alert>
        <Info class="size-4" />
        <AlertDescription>
          浏览器无法发送 ICMP，本工具以 HTTP 请求时延近似 Ping（no-cors 请求，无需目标支持跨域）；
          结果受本地网络、DNS、目标服务端响应影响，仅供参考喵～
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
