<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowRight } from "@lucide/vue";
import { toolItems } from "@/lib/tools";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "工具",
  description:
    "浏览器本地运行的加密工具：单向哈希、对称加密、非对称加密，支持多种算法可选。",
  path: "/tools",
});
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">工具</h1>
      <p class="text-muted-foreground">全部在浏览器本地运行，数据不会上传喵～</p>
    </div>

    <!-- 工具卡片：桌面导航悬停子菜单与这里共用同一份 toolItems 元数据 -->
    <div class="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
      <RouterLink
        v-for="tool in toolItems"
        :key="tool.to"
        :to="tool.to"
        class="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-[background-color,box-shadow] duration-150 hover:bg-card/80 hover:shadow-lg dark:bg-input/30 dark:hover:bg-input/50"
      >
        <div class="flex items-center justify-between">
          <component :is="tool.icon" class="size-5" />
          <ArrowRight
            class="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-base font-medium">{{ tool.label }}</span>
          <span class="text-sm leading-snug text-muted-foreground">
            {{ tool.description }}
          </span>
        </div>
      </RouterLink>
    </div>
  </main>
</template>
