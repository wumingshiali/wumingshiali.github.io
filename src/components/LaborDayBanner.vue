<script setup lang="ts">
// 劳动节彩蛋横幅：仅当日期命中劳动节（5.1-5.5）或 ?egg=cn_labor_day 时由 App.vue 渲染。
// 红橙渐变胶囊 + 锤子图标，浅深色主题下均清晰可读。
import { Hammer } from "@lucide/vue";
</script>

<template>
  <div
    role="status"
    class="mt-6 flex items-center gap-2 rounded-full bg-linear-to-r from-red-500 via-orange-400 to-red-500 px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-red-500/30 ring-1 ring-orange-300/60"
  >
    <Hammer class="size-4" aria-hidden="true" />
    <span>劳动人民万岁</span>
  </div>
</template>
