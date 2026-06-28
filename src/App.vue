<script setup lang="ts">
import { ref, watch } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Home, Info, Mail, Sun, Moon } from "@lucide/vue";

// 导航项集中管理
const navItems = [
  { to: "/", label: "主页", icon: Home },
  { to: "/contact", label: "联系", icon: Mail },
  { to: "/about", label: "关于", icon: Info },
] as const;

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
  <div class="flex flex-1 flex-col items-center gap-2">
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

    <div id="changeTips">
      <Alert variant="destructive">
        <AlertTitle>提示</AlertTitle>
        <AlertDescription>
          你正在查看v3版本，正在开发，可能不稳定或者不好看，请见谅。
        </AlertDescription>
      </Alert>
    </div>

    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <nav
      class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-border bg-card/80 p-1.5 backdrop-blur transition-colors"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground [&.router-link-active]:ring-1 [&.router-link-active]:ring-border [&.router-link-active]:hover:text-foreground dark:[&.router-link-active]:bg-primary dark:[&.router-link-active]:text-primary-foreground"
      >
        <component :is="item.icon" class="size-4" />
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>
