<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Home, Mail } from "@lucide/vue";

// 导航项集中管理
const navItems = [
  { to: "/", label: "主页", icon: Home },
  { to: "/contact", label: "联系", icon: Mail },
] as const;
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-2">
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
      class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-border bg-card/60 p-1.5 backdrop-blur"
    >
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.router-link-active]:bg-primary [&.router-link-active]:text-primary-foreground"
      >
        <component :is="item.icon" class="size-4" />
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>
