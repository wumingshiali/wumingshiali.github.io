<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { MessageSquare } from "@lucide/vue";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

// 异步加载 Giscus：chunk 在 [id].vue onMounted 时已预拉过
const Giscus = defineAsyncComponent({
  loader: () => import("@giscus/vue"),
  delay: 0,
});

interface Props {
  /** 是否打开（v-model:open） */
  open: boolean;
  /** 当前主题（同步 Giscus 明暗配色） */
  isDark: boolean;
}
defineProps<Props>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();

function onDialogUpdate(v: boolean) {
  emit("update:open", v);
}
</script>

<template>
  <!--
    中央 Dialog 弹窗：使用 shadcn-vue Dialog 组件。
    - max-w-6xl + max-h-[90vh]：放大弹窗让评论组件更宽敞
    - Giscus 容器 min-h-[480px]：iframe 加载完成前保持弹窗高度稳定
  -->
  <Dialog :open="open" @update:open="onDialogUpdate">
    <DialogContent class="max-h-[90vh] max-w-6xl overflow-y-auto">
      <DialogTitle class="flex items-center gap-2">
        <MessageSquare class="size-4" />
        评论区
      </DialogTitle>
      <div class="min-h-[480px]">
        <Giscus
          repo="wumingshiali/giscus-for-blog"
          repo-id="R_kgDOR833VQ"
          category="Announcements"
          category-id="DIC_kwDOR833Vc4C6XFc"
          mapping="pathname"
          strict="0"
          reactions-enabled="1"
          emit-metadata="0"
          input-position="top"
          :theme="isDark ? 'dark' : 'light'"
          lang="zh-CN"
          loading="lazy"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
