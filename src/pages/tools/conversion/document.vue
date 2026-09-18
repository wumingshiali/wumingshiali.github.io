<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeftRight,
  FileCode,
  Loader2,
  RefreshCw,
  WifiOff,
} from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import ToolFileInput from "@/components/ToolFileInput.vue";
import FileUploadButton from "@/components/FileUploadButton.vue";
import CopyButton from "@/components/CopyButton.vue";
import DownloadButton from "@/components/DownloadButton.vue";
import { docxToMarkdown, markdownToDocx } from "@/lib/conversion/pandoc";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "文档转换",
  description:
    "在线 Markdown 与 DOCX 双向转换：md → docx、docx → md，pandoc-wasm 本地驱动。",
  path: "/tools/conversion/document",
});

type Direction = "md2docx" | "docx2md";

const direction = ref<Direction>("md2docx");
const markdown = ref("");
const docxFile = ref<File | null>(null);
const busy = ref(false);
const loadingEngine = ref(false);
const errorMessage = ref("");
const resultDocx = ref<Uint8Array<ArrayBuffer> | null>(null);
const resultMarkdown = ref("");
const resultName = ref("");
const mediaCount = ref(0);

const wasmUnavailable = computed(() => errorMessage.value.includes("WASM"));

function setDirection(dir: Direction) {
  direction.value = dir;
  errorMessage.value = "";
  resultDocx.value = null;
  resultMarkdown.value = "";
  mediaCount.value = 0;
}

/** 上传 .md 文件：读为文本填入输入框 */
function onMarkdownLoaded(text: string) {
  markdown.value = text;
  errorMessage.value = "";
}

async function handleConvert() {
  errorMessage.value = "";
  resultDocx.value = null;
  resultMarkdown.value = "";
  mediaCount.value = 0;
  busy.value = true;
  try {
    if (direction.value === "md2docx") {
      if (!markdown.value.trim()) {
        errorMessage.value = "请先输入 Markdown 内容";
        return;
      }
      loadingEngine.value = true;
      const blob = await markdownToDocx(markdown.value, "converted.docx");
      resultDocx.value = new Uint8Array(await blob.arrayBuffer());
      resultName.value = "converted.docx";
    } else {
      if (!docxFile.value) {
        errorMessage.value = "请先选择 .docx 文件";
        return;
      }
      loadingEngine.value = true;
      const { markdown: md, media } = await docxToMarkdown(docxFile.value);
      resultMarkdown.value = md;
      mediaCount.value = Object.keys(media).length;
      resultName.value = docxFile.value.name.replace(/\.docx$/i, "") + ".md";
    }
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "转换失败，请重试";
  } finally {
    busy.value = false;
    loadingEngine.value = false;
  }
}
</script>

<template>
  <ToolLayout
    title="文档转换"
    description="Markdown 与 DOCX 双向转换，pandoc-wasm 本地驱动喵～"
    back-to="/tools/conversion"
    back-label="返回转换工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 转换方向 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center gap-2">
          <ArrowLeftRight class="size-4" />
          <h2 class="text-sm font-medium">转换方向</h2>
        </div>
        <div class="flex gap-1 rounded-xl border border-border bg-muted/60 p-1" role="tablist" aria-label="转换方向">
          <button
            type="button"
            role="tab"
            :aria-selected="direction === 'md2docx'"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="direction === 'md2docx' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="setDirection('md2docx')"
          >
            <FileCode class="size-4" />
            Markdown → DOCX
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="direction === 'docx2md'"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="direction === 'docx2md' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="setDirection('docx2md')"
          >
            <FileCode class="size-4" />
            DOCX → Markdown
          </button>
        </div>
      </section>

      <!-- 输入 -->
      <section class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <template v-if="direction === 'md2docx'">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium">Markdown 内容</span>
            <FileUploadButton
              label="上传 .md 文件"
              accept=".md,.markdown,text/markdown,text/plain"
              @loaded="onMarkdownLoaded"
            />
          </div>
          <textarea
            v-model="markdown"
            rows="8"
            placeholder="# 标题&#10;&#10;输入或粘贴 Markdown 内容，转换为 DOCX 文档…"
            class="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </template>
        <template v-else>
          <span class="text-sm font-medium">DOCX 文件</span>
          <ToolFileInput
            v-model="docxFile"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            hint="上传 .docx 文档，转换为 Markdown（内嵌图片会一并提取）"
          />
        </template>

        <Button
          type="button"
          :disabled="busy || (direction === 'md2docx' ? !markdown.trim() : !docxFile)"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="handleConvert"
        >
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          <ArrowLeftRight v-else class="size-4" />
          {{ busy ? (loadingEngine ? "正在加载 WASM 引擎…" : "转换中…") : "转换" }}
        </Button>
        <p v-if="loadingEngine" class="text-xs text-muted-foreground">
          首次使用需从 CDN 下载 pandoc 引擎（约 58MB），请耐心等待喵～
        </p>
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
      <div v-if="direction === 'md2docx' && resultDocx" class="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <span class="truncate text-sm font-medium">{{ resultName }}</span>
        <DownloadButton :filename="resultName" :data="resultDocx" />
      </div>
      <section v-if="direction === 'docx2md' && resultMarkdown" class="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">转换结果</span>
          <div class="flex items-center gap-2">
            <CopyButton :text="resultMarkdown" />
            <DownloadButton :filename="resultName" :data="resultMarkdown" />
          </div>
        </div>
        <textarea
          :value="resultMarkdown"
          rows="10"
          readonly
          class="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs leading-relaxed outline-none"
          aria-label="转换结果"
        />
        <p v-if="mediaCount" class="text-xs text-muted-foreground">
          已提取 {{ mediaCount }} 个内嵌文件并转为 data URL 内嵌到 Markdown 中喵～
        </p>
      </section>

      <Alert>
        <FileCode class="size-4" />
        <AlertDescription>
          文档转换由 pandoc-wasm 驱动，按需从 CDN 加载，文件不上传，全程本地处理；若加载失败请检查网络后重试。
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>
