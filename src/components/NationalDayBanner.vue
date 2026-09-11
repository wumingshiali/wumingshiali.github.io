<script setup lang="ts">
// 国庆彩蛋横幅：仅当日期命中国庆或 ?egg=cn_birthday 时由 App.vue 渲染。
// 红金渐变胶囊 + 旗帜图标，浅深色主题下均清晰可读。
import { Cake } from "@lucide/vue";
</script>

<template>
  <div
    role="status"
    class="mt-6 flex items-center gap-2 rounded-full bg-linear-to-r from-red-600 via-amber-400 to-red-600 px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-red-600/30 ring-1 ring-amber-300/60"
  >
    <Cake class="size-4" aria-hidden="true" />
    <span>国庆快乐</span>
  </div>
</template>
