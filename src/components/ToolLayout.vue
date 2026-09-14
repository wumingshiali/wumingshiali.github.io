<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowLeft } from "@lucide/vue";

/**
 * 工具子页统一布局：返回总览入口 + 标题 + 描述 + 内容插槽。
 * 三个工具页共用，避免重复页面骨架。
 */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <div class="flex w-full max-w-2xl flex-col items-center gap-2 text-center">
      <RouterLink
        to="/tools"
        class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" />
        返回全部工具
      </RouterLink>
      <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">{{ title }}</h1>
      <p v-if="description" class="text-muted-foreground">{{ description }}</p>
    </div>
    <slot />
  </main>
</template>
