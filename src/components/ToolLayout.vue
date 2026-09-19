<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ArrowLeft } from "@lucide/vue";
import { toolGroups } from "@/lib/tools";

/**
 * 工具子页统一布局：返回入口 + 标题 + 描述 + 左侧工具栏 + 内容插槽。
 * 加密 / 转换分组下的工具页共用，避免重复页面骨架。
 *
 * 左侧工具栏按 backTo（即所属分组路由）自动匹配分组，列出该文件夹内的
 * 全部工具并高亮当前项；桌面端为左侧固定栏，移动端为标题下横向滚动条。
 */
const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** 返回链接目标（同时也是所属分组路由），默认全部工具总览 */
    backTo?: string;
    /** 返回链接文案，默认「返回全部工具」 */
    backLabel?: string;
  }>(),
  {
    backTo: "/tools",
    backLabel: "返回全部工具",
  },
);

/** 由返回链接推导所属分组；不在分组内（如总览页）时无工具栏 */
const group = computed(() => toolGroups.find((g) => g.to === props.backTo));
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <div class="flex w-full max-w-4xl items-start gap-6">
      <!-- 左侧工具栏：当前文件夹的全部工具（桌面端） -->
      <aside
        v-if="group"
        class="sticky top-6 hidden w-44 shrink-0 flex-col gap-1 rounded-2xl border border-border bg-card p-3 lg:flex dark:bg-input/30"
      >
        <RouterLink
          :to="group.to"
          class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <component :is="group.icon" class="size-4 shrink-0" />
          {{ group.label }}工具
        </RouterLink>
        <div class="my-1 h-px bg-border" />
        <RouterLink
          v-for="tool in group.items"
          :key="tool.to"
          :to="tool.to"
          class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
        >
          <component :is="tool.icon" class="size-4 shrink-0" />
          {{ tool.label }}
        </RouterLink>
      </aside>

      <!-- 右侧：标题 + 内容 -->
      <div class="flex min-w-0 flex-1 flex-col items-center gap-6">
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

          <!-- 移动端：当前文件夹工具横向滚动条 -->
          <nav
            v-if="group"
            class="flex w-full max-w-2xl gap-1 overflow-x-auto pb-1 lg:hidden"
            aria-label="当前文件夹工具"
          >
            <RouterLink
              v-for="tool in group.items"
              :key="tool.to"
              :to="tool.to"
              class="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
            >
              <component :is="tool.icon" class="size-3.5 shrink-0" />
              {{ tool.label }}
            </RouterLink>
          </nav>
        </div>
        <slot />
      </div>
    </div>
  </main>
</template>
