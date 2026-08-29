<script setup lang="ts">
import { ref, watch } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "@lucide/vue";
import MobileNav from "@/components/MobileNav.vue";
import { navItems } from "@/lib/nav";

// 主题：dark / light，默认跟随系统偏好，选择记忆到 localStorage
const THEME_KEY = "theme";
type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const theme = ref<Theme>(getInitialTheme());
applyTheme(theme.value);

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}

watch(theme, (val) => {
  applyTheme(val);
  localStorage.setItem(THEME_KEY, val);
});
</script>

<template>
  <div class="flex flex-1 w-full flex-col items-center gap-2">
    <!-- 主题切换：暗色显太阳(转浅)，浅色显月亮(转暗) -->
    <Button
      variant="outline"
      size="icon"
      class="fixed top-4 right-4 z-50 rounded-full bg-card/60 backdrop-blur"
      :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到暗色模式'"
      @click="toggleTheme"
    >
      <Sun v-if="theme === 'dark'" class="size-4" />
      <Moon v-else class="size-4" />
    </Button>

    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <!-- 桌面端底部中央导航（lg 及以上显示）；移动端由 MobileNav 悬浮按钮替代 -->
    <nav
      class="fixed bottom-4 left-1/2 z-50 hidden -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-border bg-card/80 p-1.5 backdrop-blur lg:flex"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 hover:text-foreground [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground [&.router-link-active]:ring-1 [&.router-link-active]:ring-border dark:[&.router-link-active]:bg-primary dark:[&.router-link-active]:text-primary-foreground"
      >
        <component :is="item.icon" class="nav-icon size-4" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <!-- 移动端左下角悬浮导航按钮 + 弹出菜单 -->
    <MobileNav />
  </div>
</template>

<style>
/*
 * nav 图标：把激活态从「color 过渡」（触发 SVG path 重新栅格化、paint 主线程阻塞）
 * 改为「transform 缩放」（GPU 合成线程处理，CLS 友好）。
 * - hover：父 link group 触发 → scale-110
 * - active：父 link 命中 .router-link-active → scale-110
 * - transition 只针对 transform 单一属性
 */
.nav-icon {
  transition: transform 0.15s ease;
}
.group:hover .nav-icon {
  transform: scale(1.1);
}
.router-link-active .nav-icon {
  transform: scale(1.1);
}
</style>
