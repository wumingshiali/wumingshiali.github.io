<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { ArrowLeft, Hash, Medal } from "@lucide/vue";
import {
  getRankingById,
  sortRankingItems,
  tierOf,
} from "@/lib/rankings";
import { useSeo } from "@/composables/useSeo";

const route = useRoute<"/rankings/[id]">();

/** 当前分类（按 URL id 查找；未命中显示未找到提示） */
const category = computed(() => getRankingById(String(route.params.id ?? "")));

useSeo({
  title: computed(() => (category.value ? `${category.value.name}排名` : "排名不存在")),
  description: computed(
    () =>
      category.value?.description ??
      "这个排名分类不存在，可能被删掉了喵～",
  ),
  path: computed(() => `/rankings/${String(route.params.id ?? "")}`),
});

/** 展示模式：分数 / 等级（记忆用户偏好到 localStorage） */
type DisplayMode = "score" | "tier";
const MODE_KEY = "rankings:display-mode";

function initialMode(): DisplayMode {
  try {
    return localStorage.getItem(MODE_KEY) === "tier" ? "tier" : "score";
  } catch {
    return "score";
  }
}

const mode = ref<DisplayMode>(initialMode());
watch(mode, (value) => {
  try {
    localStorage.setItem(MODE_KEY, value);
  } catch {
    // 隐私模式下 localStorage 不可用，静默忽略
  }
});

/** 条目按分数从高到低排列 */
const sortedItems = computed(() =>
  category.value ? sortRankingItems(category.value.items) : [],
);
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <template v-if="category">
      <div class="flex w-full max-w-2xl flex-col items-center gap-2 text-center">
        <RouterLink
          to="/rankings"
          class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft class="size-4" />
          返回全部排名
        </RouterLink>
        <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">
          {{ category.name }}
        </h1>
        <p v-if="category.description" class="text-muted-foreground">
          {{ category.description }}
        </p>
      </div>

      <!-- 分数 / 等级 展示模式切换 -->
      <div
        class="grid w-full max-w-2xl grid-cols-2 gap-1 rounded-xl border border-border bg-muted/60 p-1"
        role="tablist"
        aria-label="排名展示模式"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'score'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            mode === 'score'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="mode = 'score'"
        >
          <Hash class="size-4" />
          分数
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'tier'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            mode === 'tier'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="mode = 'tier'"
        >
          <Medal class="size-4" />
          等级
        </button>
      </div>

      <!-- 排行列表：名次 / 名称 / 简洁 / 评价 / 分数或等级 -->
      <div
        v-if="sortedItems.length"
        class="flex w-full max-w-2xl flex-col gap-2"
        role="list"
      >
        <div
          v-for="(item, index) in sortedItems"
          :key="item.name"
          role="listitem"
          class="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 dark:bg-input/30"
        >
          <!-- 名次 -->
          <span
            class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
            :class="
              index === 0
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : index === 1
                  ? 'bg-slate-400/15 text-slate-500 dark:text-slate-300'
                  : index === 2
                    ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                    : 'bg-muted text-muted-foreground'
            "
          >
            {{ index + 1 }}
          </span>

          <!-- 名称 / 简洁 / 评价 -->
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="truncate font-semibold">{{ item.name }}</span>
            <span v-if="item.brief" class="text-sm text-muted-foreground">
              {{ item.brief }}
            </span>
            <span
              v-if="item.comment"
              class="text-xs leading-relaxed text-muted-foreground/80"
            >
              <span class="text-muted-foreground/50">评价：</span>{{ item.comment }}
            </span>
          </div>

          <!-- 分数或等级徽章 -->
          <template v-if="mode === 'score'">
            <span class="mt-0.5 shrink-0 text-lg font-semibold tabular-nums">
              {{ item.score }}
            </span>
          </template>
          <template v-else>
            <span
              class="mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-medium"
              :class="tierOf(item.score).badgeClass"
            >
              {{ tierOf(item.score).label }}
            </span>
          </template>
        </div>
      </div>

      <p v-else class="text-muted-foreground">
        这个分类还没有条目，去「其他工具 → 排名生成」补上吧喵～
      </p>
    </template>

    <!-- 分类不存在 -->
    <template v-else>
      <div class="flex flex-col items-center gap-3 text-center">
        <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">排名不存在</h1>
        <p class="text-muted-foreground">
          这个排名分类找不到，可能被改名或删掉了喵～
        </p>
        <RouterLink
          to="/rankings"
          class="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          ← 返回全部排名
        </RouterLink>
      </div>
    </template>
  </main>
</template>
