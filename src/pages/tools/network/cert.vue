<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileBadge, Globe, History, Info, Loader2, ScrollText } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import {
  fetchLiveCertificate,
  parseCertificatePem,
  queryCrtSh,
  type CrtShEntry,
  type LiveCert,
  type ParsedCert,
} from "@/lib/network/cert";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "证书信息",
  description:
    "证书信息工具：本地解析证书 PEM，实时查询网站当前生效的 TLS 证书，或查询历史证书透明度记录。",
  path: "/tools/network/cert",
});

type Mode = "parse" | "live" | "history";

const mode = ref<Mode>("parse");
const pemInput = ref("");
const liveInput = ref("");
const historyInput = ref("");
const busy = ref(false);
const errorMessage = ref("");
const parsed = ref<ParsedCert | null>(null);
/** 实时查询结果：每个域名一项（成功带 cert，失败带 error） */
const liveResults = ref<Array<{ domain: string; cert: LiveCert | null; error?: string }>>([]);
/** 历史查询结果：每个域名的 CT 记录列表 */
const historyResults = ref<Array<{ domain: string; entries: CrtShEntry[]; error?: string }>>([]);
const progressText = ref("");
const doneCount = ref(0);

const liveTotal = computed(
  () => liveInput.value.split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean).length,
);


function switchMode(m: Mode) {
  mode.value = m;
  errorMessage.value = "";
  parsed.value = null;
  liveResults.value = [];
  historyResults.value = [];
  progressText.value = "";
  doneCount.value = 0;
}

function reset() {
  errorMessage.value = "";
  parsed.value = null;
  liveResults.value = [];
  historyResults.value = [];
  progressText.value = "";
  doneCount.value = 0;
}

function splitDomains(input: string): string[] {
  return input
    .split(/[\r\n,]+/)
    .map((s) => s.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, ""))
    .filter(Boolean);
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

/** 实时查询：多域名串行（SSL Labs 限速，不能并发） */
async function handleLive() {
  reset();
  const domains = splitDomains(liveInput.value);
  if (!domains.length) {
    errorMessage.value = "请输入至少一个域名";
    return;
  }
  busy.value = true;
  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];
    progressText.value = `第 ${i + 1}/${domains.length} 个：${domain}`;
    try {
      const cert = await fetchLiveCertificate(domain, {
        onStatus: (status) => {
          progressText.value = `第 ${i + 1}/${domains.length} 个：${domain}（${status}）`;
        },
      });
      liveResults.value.push({ domain, cert });
    } catch (err) {
      liveResults.value.push({
        domain,
        cert: null,
        error: err instanceof Error ? err.message : "查询失败",
      });
    }
    doneCount.value = i + 1;
  }
  progressText.value = "";
  busy.value = false;
}

/** 历史查询：多域名串行查 crt.sh */
async function handleHistory() {
  reset();
  const domains = splitDomains(historyInput.value);
  if (!domains.length) {
    errorMessage.value = "请输入至少一个域名";
    return;
  }
  busy.value = true;
  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];
    progressText.value = `第 ${i + 1}/${domains.length} 个：${domain}`;
    try {
      const entries = await queryCrtSh(domain);
      historyResults.value.push({ domain, entries });
    } catch (err) {
      historyResults.value.push({
        domain,
        entries: [],
        error: err instanceof Error ? err.message : "查询失败",
      });
    }
    doneCount.value = i + 1;
  }
  progressText.value = "";
  busy.value = false;
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

function sourceLabel(source: LiveCert["source"]): string {
  return source === "ssllabs" ? "SSL Labs 实时" : "—";
}
</script>

<template>
  <ToolLayout
    title="证书信息"
    description="本地解析证书 PEM，实时查询网站当前生效的 TLS 证书，或查历史透明度记录喵～"
    back-to="/tools/network"
    back-label="返回网络工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 模式切换 -->
      <div
        class="grid gap-1 rounded-xl border border-border bg-muted/60 p-1 sm:grid-cols-3"
        role="tablist"
        aria-label="证书查询方式"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'parse'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="mode === 'parse' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="switchMode('parse')"
        >
          <ScrollText class="size-4" />
          解析 PEM
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'live'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="mode === 'live' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="switchMode('live')"
        >
          <Globe class="size-4" />
          实时证书
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'history'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="mode === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="switchMode('history')"
        >
          <History class="size-4" />
          历史证书
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

      <!-- 实时证书 -->
      <section v-if="mode === 'live'" class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <Globe class="size-4" />
          <h2 class="text-sm font-medium">域名（每行一个，支持批处理）</h2>
        </div>
        <textarea
          v-model="liveInput"
          rows="3"
          placeholder="例如：&#10;example.com&#10;github.com"
          class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <Button
          type="button"
          :disabled="busy || !liveInput.trim()"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleLive"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <Globe v-else class="size-4" />
          {{ busy ? `查询中…（${doneCount}/${liveTotal}）` : "查询实时证书" }}
        </Button>
        <p v-if="progressText" class="text-xs text-muted-foreground" role="status">
          {{ progressText }}
        </p>

        <div v-if="liveResults.length" class="flex flex-col gap-2">
          <div
            v-for="item in liveResults"
            :key="item.domain"
            class="rounded-xl border border-border bg-background px-3 py-2.5"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-mono text-sm font-medium">{{ item.domain }}</span>
              <span
                v-if="item.cert"
                class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {{ sourceLabel(item.cert.source) }}
              </span>
              <span
                v-else
                class="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
              >
                失败
              </span>
            </div>
            <template v-if="item.cert">
              <div class="mt-1.5 flex items-center justify-between gap-2">
                <span class="truncate text-xs text-muted-foreground">主题</span>
                <span class="truncate font-mono text-xs">{{ item.cert.subject }}</span>
              </div>
              <div class="mt-1 flex items-center justify-between gap-2">
                <span class="shrink-0 text-xs text-muted-foreground">颁发者</span>
                <span class="truncate font-mono text-xs">{{ item.cert.issuer || "—" }}</span>
              </div>
              <div class="mt-1 flex items-center justify-between gap-2">
                <span class="shrink-0 text-xs text-muted-foreground">有效期</span>
                <span class="text-right text-xs">
                  {{ fmtDate(item.cert.notBefore) }} ~ {{ fmtDate(item.cert.notAfter) }}
                  <span
                    class="ml-1 rounded-full px-2 py-0.5 font-medium"
                    :class="item.cert.expired ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
                  >
                    {{ daysText(item.cert.daysLeft) }}
                  </span>
                </span>
              </div>
              <p v-if="item.cert.subjectAltNames.length" class="mt-1 truncate text-xs text-muted-foreground" :title="item.cert.subjectAltNames.join(' ')">
                SAN：{{ item.cert.subjectAltNames.join(" / ") }}
              </p>
            </template>
            <p v-else class="mt-1 text-xs text-destructive">{{ item.error }}</p>
          </div>
        </div>
      </section>

      <!-- 历史证书 -->
      <section v-if="mode === 'history'" class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <History class="size-4" />
          <h2 class="text-sm font-medium">域名（每行一个，支持批处理）</h2>
        </div>
        <textarea
          v-model="historyInput"
          rows="3"
          placeholder="例如：&#10;example.com&#10;github.com"
          class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
        <Button
          type="button"
          :disabled="busy || !historyInput.trim()"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleHistory"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <History v-else class="size-4" />
          查询历史证书
        </Button>
        <p v-if="progressText" class="text-xs text-muted-foreground" role="status">
          {{ progressText }}
        </p>

        <div v-if="historyResults.length" class="flex flex-col gap-2">
          <div
            v-for="result in historyResults"
            :key="result.domain"
            class="rounded-xl border border-border bg-background px-3 py-2.5"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate font-mono text-sm font-medium">{{ result.domain }}</span>
              <span
                v-if="!result.error"
                class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {{ result.entries.length }} 条记录
              </span>
            </div>
            <template v-if="!result.error">
              <p v-if="!result.entries.length" class="mt-1 text-xs text-muted-foreground">无记录</p>
              <div class="mt-1.5 flex flex-col gap-1.5">
                <div
                  v-for="entry in result.entries.slice(0, 25)"
                  :key="entry.id"
                  class="rounded-lg border border-border px-2.5 py-1.5 text-xs"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate font-mono font-medium text-foreground">{{ entry.commonName || "（无通用名）" }}</span>
                    <span class="shrink-0 text-muted-foreground">{{ fmtDate(entry.notAfter) }}</span>
                  </div>
                  <p class="mt-0.5 truncate text-muted-foreground" :title="entry.nameValue">
                    SAN：{{ entry.nameValue || "—" }}
                  </p>
                  <p class="truncate text-muted-foreground">颁发者：{{ entry.issuerName || "—" }}</p>
                </div>
                <p v-if="result.entries.length > 25" class="text-xs text-muted-foreground">
                  其余 {{ result.entries.length - 25 }} 条记录已省略
                </p>
              </div>
            </template>
            <p v-else class="mt-1 text-xs text-destructive">{{ result.error }}</p>
          </div>
        </div>
      </section>

      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>

      <Alert>
        <Info class="size-4" />
        <AlertDescription>
          实时证书由 SSL Labs 完成分析（首次约 30~90 秒），返回网站当前生效的证书；
          历史证书来自 crt.sh 证书透明度日志（含已更换/已过期记录）。
          PEM 解析完全在本地完成，不会上传喵～
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
