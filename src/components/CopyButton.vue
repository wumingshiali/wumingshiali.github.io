<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "@lucide/vue";

/**
 * 复制按钮：点击把 text 写入剪贴板，成功后短暂显示「已复制」反馈。
 * 与联系页复制交互保持一致，三个工具页共用。
 */
const props = defineProps<{
  text: string;
  disabled?: boolean;
}>();

const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

async function handleCopy() {
  if (!props.text) return;
  await navigator.clipboard?.writeText(props.text);
  copied.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    copied.value = false;
  }, 1500);
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    :disabled="disabled"
    class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
    @click="handleCopy"
  >
    <Check v-if="copied" class="size-4 text-emerald-500" />
    <Copy v-else class="size-4" />
    {{ copied ? "已复制" : "复制" }}
  </Button>
</template>
