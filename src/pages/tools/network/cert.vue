<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileBadge, Globe, Info, Loader2, ScrollText } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import {
  parseCertificatePem,
  queryCrtSh,
  type CrtShEntry,
  type ParsedCert,
} from "@/lib/network/cert";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "证书信息",
  description:
    "证书信息工具：本地解析证书 PEM（主题、颁发者、有效期、SAN），或按域名查询证书透明度日志。",
  path: "/tools/network/cert",
});

type Mode = "parse" | "query";

const mode = ref<Mode>("parse");
const pemInput = ref("");
const domainInput = ref("");
const busy = ref(false);
const errorMessage = ref("");
const parsed = ref<ParsedCert | null>(null);
const entries = ref<CrtShEntry[]>([]);
const usedQuery = ref("");

function switchMode(m: Mode) {
  mode.value = m;
  errorMessage.value = "";
  parsed.value = null;
  entries.value = [];
}

async function handleParse() {
  errorMessage.value = "";
  parsed.value = null;
  busy.value = true;
  try {
    parsed.value = parseCertificatePem(pemInput.value);
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "证书解析失败，请检查 PEM 内容";
  } finally {
    busy.value = false;
  }
}

async function handleQuery() {
  errorMessage.value = "";
  entries.value = [];
  busy.value = true;
  try {
    entries.value = await queryCrtSh(domainInput.value);
    usedQuery.value = domainInput.value.trim();
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "查询失败";
  } finally {
    busy.value = false;
  }
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("zh-CN", { hour12: false });
}

function daysText(days: number): string {
  if (days < 0) return `已过期 ${-days} 天`;
  if (days === 0) return "今天到期";
  return `剩 ${days} 天`;
}
</script>

<template>
  <ToolLayout
    title="证书信息"
    description="解析证书 PEM 或查询证书透明度日志喵～"
    back-to="/tools/network"
    back-label="返回网络工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 模式切换 -->
      <div class="flex gap-1 rounded-xl border border-border bg-muted/60 p-1" role="tablist" aria-label="证书查询方式">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'parse'"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="mode === 'parse' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="switchMode('parse')"
        >
          <ScrollText class="size-4" />
          解析 PEM（本地）
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'query'"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="mode === 'query' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="switchMode('query')"
        >
          <Globe class="size-4" />
          按域名查询（在线）
        </button>
      </div>

      <!-- 本地解析 -->
      <section v-if="mode === 'parse'" class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <FileBadge class="size-4" />
          <h2 class="text-sm font-medium">证书 PEM 内容</h2>
        </div>
        <textarea
          v-model="pemInput"
          rows="7"
          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
          class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <Button
          type="button"
          :disabled="busy || !pemInput.trim()"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleParse"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <ScrollText v-else class="size-4" />
          解析证书
        </Button>

        <div v-if="parsed" class="flex flex-col gap-1.5 text-sm">
          <div class="flex justify-between gap-2 border-b border-border pb-1">
            <span class="text-muted-foreground">主题（Subject）</span>
            <span class="text-right font-mono text-xs">{{ parsed.subject }}</span>
          </div>
          <div class="flex justify-between gap-2 border-b border-border pb-1">
            <span class="text-muted-foreground">颁发者（Issuer）</span>
            <span class="text-right font-mono text-xs">{{ parsed.issuer }}</span>
          </div>
          <div class="flex justify-between gap-2 border-b border-border pb-1">
            <span class="text-muted-foreground">序列号</span>
            <span class="text-right font-mono text-xs">{{ parsed.serialNumber }}</span>
          </div>
          <div class="flex justify-between gap-2 border-b border-border pb-1">
            <span class="text-muted-foreground">生效时间</span>
            <span class="text-right text-xs">{{ fmtDate(parsed.notBefore) }}</span>
          </div>
          <div class="flex items-center justify-between gap-2 border-b border-border pb-1">
            <span class="text-muted-foreground">过期时间</span>
            <span class="text-right text-xs">
              {{ fmtDate(parsed.notAfter) }}
              <span
                class="ml-1 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="parsed.expired ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
              >
                {{ daysText(parsed.daysLeft) }}
              </span>
            </span>
          </div>
          <div class="flex justify-between gap-2 border-b border-border pb-1">
            <span class="text-muted-foreground">签名算法</span>
            <span class="text-right font-mono text-xs">{{ parsed.signatureAlgorithm }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-muted-foreground">备用名称（SAN）</span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="name in parsed.subjectAltNames"
                :key="name"
                class="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {{ name }}
              </span>
              <span v-if="!parsed.subjectAltNames.length" class="text-xs text-muted-foreground">无</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 在线查询 -->
      <section v-else class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <Globe class="size-4" />
          <h2 class="text-sm font-medium">按域名查询（证书透明度日志）</h2>
        </div>
        <input
          v-model="domainInput"
          type="text"
          spellcheck="false"
          placeholder="例如：example.com"
          class="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <Button
          type="button"
          :disabled="busy || !domainInput.trim()"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleQuery"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <Globe v-else class="size-4" />
          查询
        </Button>

        <div v-if="entries.length" class="flex flex-col gap-2">
          <span class="text-sm text-muted-foreground">
            「{{ usedQuery }}」共 {{ entries.length }} 条证书记录
          </span>
          <div
            v-for="entry in entries.slice(0, 50)"
            :key="entry.id"
            class="rounded-xl border border-border bg-background px-3 py-2 text-xs"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-mono font-medium text-foreground">{{ entry.commonName || "（无通用名）" }}</span>
              <span class="shrink-0 text-muted-foreground">{{ fmtDate(entry.notAfter) }}</span>
            </div>
            <p class="mt-1 truncate text-muted-foreground" :title="entry.nameValue">
              SAN：{{ entry.nameValue || "—" }}
            </p>
            <p class="mt-0.5 truncate text-muted-foreground">颁发者：{{ entry.issuerName || "—" }}</p>
          </div>
        </div>
      </section>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>

      <Alert>
        <Info class="size-4" />
        <AlertDescription>
          PEM 解析完全在本地完成，不会上传；按域名查询走 crt.sh（证书透明度日志），
          若被浏览器跨域策略拦截会提示，请改用「解析 PEM」方式喵～
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
