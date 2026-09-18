<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowRight } from "@lucide/vue";
import { toolGroups } from "@/lib/tools";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "工具",
  description:
    "浏览器本地运行的工具集：加密（哈希 / 对称 / 非对称）与转换（图片 / 视频 / 文档）。",
  path: "/tools",
});
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">工具</h1>
      <p class="text-muted-foreground">全部在浏览器本地运行，数据不会上传喵～</p>
    </div>

    <!-- 工具分组卡片：加密 / 转换两个「文件夹」 -->
    <div class="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="group in toolGroups"
        :key="group.to"
        :to="group.to"
        class="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-[background-color,box-shadow] duration-150 hover:bg-card/80 hover:shadow-lg dark:bg-input/30 dark:hover:bg-input/50"
      >
        <div class="flex items-center justify-between">
          <component :is="group.icon" class="size-5" />
          <ArrowRight
            class="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-base font-medium">{{ group.label }}</span>
          <span class="text-sm leading-snug text-muted-foreground">
            {{ group.description }}
          </span>
        </div>
      </RouterLink>
    </div>
  </main>
</template>
