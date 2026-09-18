<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowLeft } from "@lucide/vue";

/**
 * 工具子页统一布局：返回所属分组入口 + 标题 + 描述 + 内容插槽。
 * 加密 / 转换分组下的工具页共用，避免重复页面骨架。
 */
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** 返回链接目标，默认全部工具总览 */
    backTo?: string;
    /** 返回链接文案，默认「返回全部工具」 */
    backLabel?: string;
  }>(),
  {
    backTo: "/tools",
    backLabel: "返回全部工具",
  },
);
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <div class="flex w-full max-w-2xl flex-col items-center gap-2 text-center">
      <RouterLink
        :to="backTo"
        class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" />
        {{ backLabel }}
      </RouterLink>
      <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">{{ title }}</h1>
      <p v-if="description" class="text-muted-foreground">{{ description }}</p>
    </div>
    <slot />
  </main>
</template>
