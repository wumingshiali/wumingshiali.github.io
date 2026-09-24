<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, Network } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import CopyButton from "@/components/CopyButton.vue";
import DownloadButton from "@/components/DownloadButton.vue";
import { expandCidrs, type ExpandResult } from "@/lib/network/cidr";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "CIDR 展开",
  description:
    "在线 CIDR 展开工具：批量展开 IPv4 CIDR 为全部 IP，Rust wasm 核心加速、JS 自动回退。",
  path: "/tools/network/cidr",
});

const input = ref("");
const busy = ref(false);
const result = ref<ExpandResult | null>(null);
const warning = ref("");
const errorMessage = ref("");

const SAMPLE = `192.168.1.0/30
10.0.0.128/29
172.16.0.0/28`;

function fillSample() {
  input.value = SAMPLE;
  result.value = null;
  warning.value = "";
  errorMessage.value = "";
}

async function handleExpand() {
  errorMessage.value = "";
  warning.value = "";
  busy.value = true;
  try {
    const res = await expandCidrs(input.value);
    result.value = res;
    if (res.errors.length) {
      warning.value = res.errors.join("\n");
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : "展开失败";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <ToolLayout
    title="CIDR 展开"
    description="批量把 CIDR 段展开为全部 IP，Rust wasm 核心加速、自动回退 JS 喵～"
    back-to="/tools/network"
    back-label="返回网络工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <Network class="size-4" />
            <h2 class="text-sm font-medium">CIDR 列表（每行一个，支持批处理）</h2>
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
          rows="6"
          placeholder="例如：&#10;192.168.1.0/30&#10;10.0.0.0/24"
          class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <Button
          type="button"
          :disabled="busy || !input.trim()"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleExpand"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <Network v-else class="size-4" />
          {{ busy ? "展开中…" : "展开" }}
        </Button>
      </section>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="warning" class="whitespace-pre-line text-sm text-amber-600 dark:text-amber-400" role="alert">
        {{ warning }}
      </p>

      <section v-if="result" class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-sm font-medium">展开结果</span>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {{ result.engine === "wasm" ? "Rust wasm" : "JS 回退" }} 引擎
            </span>
            <CopyButton :text="result.text" :disabled="!result.text" />
            <DownloadButton filename="cidr-ips.txt" :data="result.text" :disabled="!result.text" />
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ result.lineCount }} 个 CIDR，共 {{ result.count.toLocaleString() }} 个 IP
        </p>
        <textarea
          :value="result.text"
          rows="8"
          readonly
          class="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs leading-relaxed outline-none"
          aria-label="CIDR 展开结果"
        />
      </section>

      <Alert>
        <Info class="size-4" />
        <AlertDescription>
          展开核心由 Rust 编译为 wasm（约 19KB）在本地执行；wasm 加载失败时自动回退纯 JS。
          单条展开数量上限 104 万、总量上限 100 万，超大范围请自行分段处理喵～
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
