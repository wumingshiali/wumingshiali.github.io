<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowLeft, ArrowRight } from "@lucide/vue";
import type { ToolGroup } from "@/lib/tools";
import { useSeo } from "@/composables/useSeo";

/** 工具分组首页：返回全部工具 + 分组标题 + 组内工具卡片 */
const props = defineProps<{ group: ToolGroup }>();

useSeo({
  title: `${props.group.label}工具`,
  description: props.group.description,
  path: props.group.to,
});
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
      <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">
        {{ group.label }}工具
      </h1>
      <p class="text-muted-foreground">{{ group.description }}</p>
    </div>

    <!-- 分组内工具卡片 -->
    <div class="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
      <RouterLink
        v-for="tool in group.items"
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
