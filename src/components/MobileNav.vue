<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Menu, X } from "@lucide/vue";
import { navItems } from "@/lib/nav";

const open = ref(false);
</script>

<template>
  <!--
    移动端导航：左下角悬浮按钮，点击后向上弹出纵向菜单（从上往下布局）。
    - lg 及以上隐藏，桌面端沿用 App.vue 底部中央导航
    - Popover 自带「点击外部 / Esc 关闭」，满足点击其他地方收起
    - 点击菜单项后自动收起（导航即选择完成）
  -->
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="icon"
        class="fixed bottom-4 left-4 z-50 size-12 rounded-full border border-border bg-card/80 shadow-lg backdrop-blur lg:hidden"
        :aria-label="open ? '关闭导航菜单' : '打开导航菜单'"
        :aria-expanded="open"
      >
        <X v-if="open" class="size-5" />
        <Menu v-else class="size-5" />
      </Button>
    </PopoverTrigger>

    <PopoverContent
      side="top"
      align="start"
      :side-offset="12"
      class="w-44 rounded-2xl border-border bg-card/95 p-1.5 shadow-lg backdrop-blur"
    >
      <div class="flex flex-col gap-0.5">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
          @click="open = false"
        >
          <component :is="item.icon" class="mobile-nav-icon size-4 shrink-0" />
          {{ item.label }}
        </RouterLink>
      </div>
    </PopoverContent>
  </Popover>
</template>

<style scoped>
/*
 * 菜单图标：hover 时轻微放大（GPU 合成，与桌面导航 nav-icon 一致的做法）
 */
.mobile-nav-icon {
  transition: transform 0.15s ease;
}
.group:hover .mobile-nav-icon {
  transform: scale(1.1);
}
</style>
