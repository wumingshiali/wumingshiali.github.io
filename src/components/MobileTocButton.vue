<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { List } from "@lucide/vue";
import type { Heading } from "@/lib/posts";
import TableOfContentsList from "./TableOfContentsList.vue";

interface Props {
  /** 文章标题大纲，用于在抽屉内渲染目录列表 */
  headings: Heading[];
}
defineProps<Props>();

const open = ref(false);

function onNavigate() {
  // 列表点击跳转后自动关闭抽屉
  open.value = false;
}
</script>

<template>
  <!--
    右下角浮动按钮：lg 以下显示，避开 App.vue 底部中央的 nav 栏（bottom-4 left-1/2 z-50）。
    z-40 让按钮在主题切换按钮（z-50）之下、nav 栏之上；位置互不冲突因 nav 居中。
  -->
  <Button
    v-if="headings.length > 0"
    size="icon"
    class="fixed bottom-20 right-4 z-40 rounded-full border border-border bg-card/80 shadow-md backdrop-blur lg:hidden"
    aria-label="打开文章目录"
    @click="open = true"
  >
    <List class="size-4" />
  </Button>

  <Dialog v-model:open="open">
    <DialogContent class="max-h-[80vh] overflow-y-auto">
      <div class="flex flex-col gap-1.5">
        <DialogTitle>文章目录</DialogTitle>
        <DialogDescription>点击章节快速跳转</DialogDescription>
      </div>
      <TableOfContentsList
        :headings="headings"
        :show-comment-button="false"
        @navigate="onNavigate"
      />
    </DialogContent>
  </Dialog>
</template>
