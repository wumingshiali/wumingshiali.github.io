<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  type?: string;
  class?: HTMLAttributes["class"];
}>();
const model = defineModel<string>();
</script>

<template>
  <input
    v-model="model"
    :type="type ?? 'text'"
    data-slot="input"
    :class="cn(
      'flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  >
</template>
