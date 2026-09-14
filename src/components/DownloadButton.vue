<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Check, Download } from "@lucide/vue";

/**
 * 下载按钮：把文本或二进制数据保存为本地文件。
 * data 为 null / 空时禁用；成功后短暂显示「已下载」反馈。
 */
const props = defineProps<{
  filename: string;
  data: string | Uint8Array<ArrayBuffer> | null;
  /** 文本数据的 MIME，默认 text/plain */
  mime?: string;
  disabled?: boolean;
}>();

const done = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

function handleDownload() {
  if (!props.data) return;
  const blob =
    typeof props.data === "string"
      ? new Blob([props.data], { type: props.mime ?? "text/plain;charset=utf-8" })
      : new Blob([props.data]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = props.filename;
  anchor.click();
  URL.revokeObjectURL(url);
  done.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    done.value = false;
  }, 1500);
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    :disabled="disabled || !data"
    class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
    @click="handleDownload"
  >
    <Check v-if="done" class="size-4 text-emerald-500" />
    <Download v-else class="size-4" />
    {{ done ? "已下载" : "下载" }}
  </Button>
</template>
