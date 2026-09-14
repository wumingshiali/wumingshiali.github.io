<script setup lang="ts">
import { FileText, FileUp } from "@lucide/vue";

/**
 * 工具页「文本 / 文件」输入模式切换（三个工具页共用）。
 * 纯受控组件：modelValue 由父级管理，保证与动画过渡配合。
 */
defineProps<{
  modelValue: "text" | "file";
}>();

const emit = defineEmits<{
  "update:modelValue": [value: "text" | "file"];
}>();
</script>

<template>
  <div
    class="flex gap-1 rounded-xl border border-border bg-muted/60 p-1"
    role="tablist"
    aria-label="输入方式"
  >
    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'text'"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
      :class="
        modelValue === 'text'
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      "
      @click="emit('update:modelValue', 'text')"
    >
      <FileText class="size-4" />
      文本
    </button>
    <button
      type="button"
      role="tab"
      :aria-selected="modelValue === 'file'"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
      :class="
        modelValue === 'file'
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      "
      @click="emit('update:modelValue', 'file')"
    >
      <FileUp class="size-4" />
      文件
    </button>
  </div>
</template>
