<script setup lang="ts">
import { MessageSquare, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";

interface Props {
  /** 是否处于打开态（v-model:open，用于切换图标与文字） */
  open: boolean;
}
defineProps<Props>();

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();
</script>

<template>
  <!--
    评论按钮：shadcn-vue Button 组件 + outline variant + default size
    - 作为父级容器的 flex 子项显示，位置由 [id].vue 的 fixed flex column 容器决定
    - slot 放图标 + 文字确保渲染
  -->
  <Button
    variant="outline"
    size="default"
    class="z-10 gap-2 rounded-lg border-border bg-card/90 px-5 py-2 text-sm shadow-lg backdrop-blur hover:bg-card"
    :aria-label="open ? '关闭评论区' : '打开评论区'"
    @click="emit('update:open', !open)"
  >
    <X v-if="open" class="size-4 shrink-0" />
    <MessageSquare v-else class="size-4 shrink-0" />
    <span class="font-medium">{{ open ? "关闭" : "评论" }}</span>
  </Button>
</template>
