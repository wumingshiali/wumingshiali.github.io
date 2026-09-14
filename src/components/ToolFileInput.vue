<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { FileUp, X } from "@lucide/vue";

/**
 * 工具页文件选择卡片（三个工具页共用）。
 * - 未选文件：虚线点击区；已选：文件名 + 大小 + 更换 / 移除
 * - 纯受控组件：modelValue 为 File | null
 */
const props = defineProps<{
  modelValue: File | null;
  /** 未选择时的提示文案 */
  hint?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: File | null];
}>();

/** 文件大小展示：B / KB / MB */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 选择文件后上报；清空 input.value 以便重复选择同一文件 */
function onFileChange(event: Event) {
  const inputEl = event.target as HTMLInputElement;
  const selected = inputEl.files?.[0];
  if (selected) emit("update:modelValue", selected);
  inputEl.value = "";
}

function removeFile() {
  emit("update:modelValue", null);
}
</script>

<template>
  <label
    v-if="!props.modelValue"
    class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card px-4 py-10 text-center transition-colors hover:bg-card/80 dark:bg-input/30 dark:hover:bg-input/50"
  >
    <FileUp class="size-8 text-muted-foreground" />
    <span class="text-sm font-medium">点击选择文件</span>
    <span v-if="props.hint" class="text-xs text-muted-foreground">
      {{ props.hint }}
    </span>
    <input
      type="file"
      class="hidden"
      aria-label="选择要处理的文件"
      @change="onFileChange"
    />
  </label>
  <div
    v-else
    class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30"
  >
    <FileUp class="size-5 shrink-0 text-muted-foreground" />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-sm font-medium">{{ props.modelValue.name }}</span>
      <span class="text-xs text-muted-foreground">
        {{ formatSize(props.modelValue.size) }}
      </span>
    </div>
    <label
      class="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      更换
      <input type="file" class="hidden" aria-label="更换文件" @change="onFileChange" />
    </label>
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="size-8 rounded-full border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
      :aria-label="`移除文件 ${props.modelValue.name}`"
      @click="removeFile"
    >
      <X class="size-4" />
    </Button>
  </div>
</template>
