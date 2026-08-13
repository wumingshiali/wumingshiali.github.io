<script setup lang="ts">
import type { AvatarFallbackProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { AvatarFallback } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<
  AvatarFallbackProps & { class?: HTMLAttributes["class"] }
>();

// 内联实现 reactiveOmit：仅排除 "class" 字段，其余透传给 reka-ui
const delegatedProps = computed(() => {
  const { class: _, ...rest } = props;
  return rest;
});
</script>

<template>
  <AvatarFallback
    data-slot="avatar-fallback"
    v-bind="delegatedProps"
    :class="
      cn(
        'bg-muted text-muted-foreground rounded-full flex size-full items-center justify-center text-sm group-data-[size=sm]/avatar:text-xs',
        props.class,
      )
    "
  >
    <slot />
  </AvatarFallback>
</template>
