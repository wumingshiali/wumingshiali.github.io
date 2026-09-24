<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, MapPin } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import { lookupIps, type IpLocation } from "@/lib/network/ip";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "IP 归属",
  description:
    "在线 IP 归属查询：批量查询 IP 的国家 / 省市 / ISP，百度数据源优先、ipwho.is 回退。",
  path: "/tools/network/ip",
});

const input = ref("");
const busy = ref(false);
const results = ref<IpLocation[]>([]);
const errorMessage = ref("");

const SAMPLE = `8.8.8.8
114.114.114.114
223.5.5.5`;

function fillSample() {
  input.value = SAMPLE;
  results.value = [];
  errorMessage.value = "";
}

async function handleLookup() {
  errorMessage.value = "";
  results.value = [];
  const ips = input.value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ips.length) {
    errorMessage.value = "请输入至少一个 IP";
    return;
  }
  busy.value = true;
  try {
    results.value = await lookupIps(ips);
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : "查询失败";
  } finally {
    busy.value = false;
  }
}

function sourceLabel(source: IpLocation["source"]): string {
  return source === "baidu" ? "百度" : source === "ipwho" ? "ipwho.is" : "—";
}
</script>

<template>
  <ToolLayout
    title="IP 归属"
    description="批量查询 IP 归属地（省市 / ISP），联网查询喵～"
    back-to="/tools/network"
    back-label="返回网络工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <MapPin class="size-4" />
            <h2 class="text-sm font-medium">IP 列表（每行一个，支持批处理）</h2>
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
          rows="5"
          placeholder="每行一个 IPv4，例如：&#10;8.8.8.8&#10;114.114.114.114"
          class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <Button
          type="button"
          :disabled="busy || !input.trim()"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleLookup"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <MapPin v-else class="size-4" />
          {{ busy ? "查询中…" : "查询归属" }}
        </Button>
      </section>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>

      <section v-if="results.length" class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <span class="text-sm font-medium">查询结果（{{ results.length }} 条）</span>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="item in results"
            :key="item.ip"
            class="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
          >
            <span class="shrink-0 font-mono text-sm">{{ item.ip }}</span>
            <span class="min-w-0 flex-1 truncate text-right text-sm">
              <span v-if="item.location" class="text-foreground">{{ item.location }}</span>
              <span v-else class="text-destructive">{{ item.error ?? "查询失败" }}</span>
            </span>
            <span class="w-16 shrink-0 text-right text-xs text-muted-foreground">
              {{ sourceLabel(item.source) }}
            </span>
          </div>
        </div>
      </section>

      <Alert>
        <Info class="size-4" />
        <AlertDescription>
          归属数据来自百度 opendata（国内省市 + ISP）与 ipwho.is，均为在线查询；
          批量查询并发执行，接口有频率限制，量过大时请分批喵～
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
