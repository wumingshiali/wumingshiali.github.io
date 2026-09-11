<script setup lang="ts">
// 中秋节彩蛋横幅：仅当日期命中农历八月十五（香港天文台 API）或 ?egg=cn_mid_autumn 时
// 由 App.vue 渲染。金色月夜胶囊 + 月亮图标，浅深色主题下均清晰可读。
// 农历转换数据来自香港天文台开放数据，横幅下方附带来源标注链接。
import { MoonStar } from "@lucide/vue";
import { HKO_LUNAR_API_DOC } from "@/lib/festival";
</script>

<template>
  <div class="mt-6 flex flex-col items-center gap-1.5">
    <div
      role="status"
      class="flex items-center gap-2 rounded-full bg-linear-to-r from-amber-500 via-yellow-200 to-amber-500 px-4 py-1.5 text-sm font-medium text-amber-950 shadow-md shadow-amber-500/30 ring-1 ring-amber-200/70"
    >
      <MoonStar class="size-4" aria-hidden="true" />
      <span>中秋快乐</span>
    </div>
    <a
      :href="HKO_LUNAR_API_DOC"
      target="_blank"
      rel="noopener noreferrer"
      class="text-xs text-muted-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
    >
      农历数据来源：香港天文台
    </a>
  </div>
</template>
