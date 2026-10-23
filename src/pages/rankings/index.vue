<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ArrowRight, Trophy } from "@lucide/vue";
import {
  getAllRankings,
  tierOf,
  type RankingCategory,
} from "@/lib/rankings";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "排名",
  description:
    "各种东西的排名榜：美食、动漫、游戏、软件……按分数排列，可切换分数与等级展示喵～",
  path: "/rankings",
});

/** 分类卡片汇总：条目数 / 平均分 / 最高等级 */
function summarize(category: RankingCategory) {
  const items = category.items;
  const count = items.length;
  if (count === 0) {
    return { count: 0, avg: null, topTier: null };
  }
  const avg = Math.round(items.reduce((sum, item) => sum + item.score, 0) / count);
  const topScore = Math.max(...items.map((item) => item.score));
  return { count, avg, topTier: tierOf(topScore) };
}

const rankings = getAllRankings();
const cards = computed(() =>
  rankings.map((category) => ({ category, ...summarize(category) })),
);
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">排名</h1>
      <p class="text-muted-foreground">
        各种东西的排名榜，点进去看详细排行喵～（数据在 src/rankings/data.toml）
      </p>
    </div>

    <!-- 分类卡片：美食 / 动漫 / 游戏 / 软件…… -->
    <div
      v-if="cards.length"
      class="grid w-full max-w-2xl gap-3 sm:grid-cols-2"
    >
      <RouterLink
        v-for="card in cards"
        :key="card.category.id"
        :to="`/rankings/${card.category.id}`"
        class="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-[background-color,box-shadow] duration-150 hover:bg-card/80 hover:shadow-lg dark:bg-input/30 dark:hover:bg-input/50"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Trophy class="size-5" />
            <span class="text-base font-medium">{{ card.category.name }}</span>
          </div>
          <ArrowRight
            class="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </div>

        <p v-if="card.category.description" class="text-sm leading-snug text-muted-foreground">
          {{ card.category.description }}
        </p>

        <div class="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{{ card.count }} 项</span>
          <template v-if="card.avg !== null">
            <span class="text-muted-foreground/60">·</span>
            <span>平均 {{ card.avg }} 分</span>
            <span v-if="card.topTier" class="text-muted-foreground/60">·</span>
            <span
              v-if="card.topTier"
              class="rounded-full border px-2 py-0.5 font-medium"
              :class="card.topTier.badgeClass"
            >
              {{ card.topTier.label }}
            </span>
          </template>
        </div>
      </RouterLink>
    </div>

    <p v-else class="text-muted-foreground">
      还没有任何排名，去「其他工具 → 排名生成」创建一个吧喵～
    </p>
  </main>
</template>
