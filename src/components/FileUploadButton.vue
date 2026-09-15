<script setup lang="ts">
import { Upload } from "@lucide/vue";

/**
 * 上传按钮：选择文件后读取为 UTF-8 文本并通过 loaded 事件上报。
 * 三个工具页共用（密文文件 / 公私钥文件导入）。
 * 说明：工具生成的密文与密钥都是文本格式（base64 / PEM），读取为文本即可。
 */
const props = withDefaults(
  defineProps<{
    /** 按钮文案 */
    label: string;
    /** 文件选择过滤，如 ".enc,.txt" */
    accept?: string;
  }>(),
  { accept: "text/plain,.txt,.enc,.pem,.key" },
);

const emit = defineEmits<{
  loaded: [text: string];
}>();

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    const text = await file.text();
    emit("loaded", text);
  }
  // 清空以便重复选择同一文件
  input.value = "";
}
</script>

<template>
  <label
    class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground transition-colors hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
  >
    <Upload class="size-4" />
    {{ props.label }}
    <input
      type="file"
      class="hidden"
      :accept="props.accept"
      :aria-label="props.label"
      @change="onFileChange"
    />
  </label>
</template>
