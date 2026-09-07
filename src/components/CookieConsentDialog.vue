<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { onMounted } from "vue";
import { useCookieConsent } from "@/composables/useCookieConsent";

const { open, statistics, needsPrompt, acceptAll, acceptNecessary, confirm } =
  useCookieConsent();

onMounted(() => {
  // SSG 预渲染阶段不显示（vite-plugin-ssg 注入 __SSG_RENDER__ 标记），
  // 避免交互弹窗固化进静态 HTML 导致 hydrate 残留/重复；
  // 仅真实浏览器首次访问时弹出
  if (needsPrompt && !(window as unknown as { __SSG_RENDER__?: boolean }).__SSG_RENDER__) {
    open.value = true;
  }
});
</script>

<template>
  <!-- Cookie 选择弹窗：首次进入（无 cookie_consent）时出现 -->
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-sm">
      <DialogTitle>Cookie 设置</DialogTitle>
      <DialogDescription>
        我们使用 Cookies 来保障网站正常运行，并优化您的浏览体验。
      </DialogDescription>

      <div class="flex flex-col gap-3">
        <!-- 必要 Cookies：固定开启，不可取消 -->
        <div
          class="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
        >
          <Checkbox :checked="true" disabled class="mt-0.5" />
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">必要 Cookies</span>
            <span class="text-xs text-muted-foreground">
              维持网站运行的 Cookies
            </span>
            <span class="text-xs text-muted-foreground/70">状态记录</span>
          </div>
        </div>

        <!-- 统计 Cookies：可勾选，默认开启 -->
        <div
          class="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
        >
          <Checkbox v-model:checked="statistics" class="mt-0.5" />
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">统计 Cookies</span>
            <span class="text-xs text-muted-foreground">
              优化用户体验的 Cookies
            </span>
            <span class="text-xs text-muted-foreground/70">
              自建 Umami、Microsoft Clarity
            </span>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <Button class="w-full" @click="acceptAll">
          接受所有 Cookies
        </Button>
        <Button variant="secondary" class="w-full" @click="acceptNecessary">
          接受必要 Cookies
        </Button>
        <Button variant="outline" class="w-full" @click="confirm">
          确认
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
