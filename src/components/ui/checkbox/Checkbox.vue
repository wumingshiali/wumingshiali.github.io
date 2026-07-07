<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { CheckboxRoot, CheckboxIndicator } from "reka-ui";
import { Check } from "@lucide/vue";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const model = defineModel<boolean>();
</script>

<template>
  <CheckboxRoot
    v-model="model"
    data-slot="checkbox"
    :class="cn(
      'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      props.class,
    )"
  >
    <CheckboxIndicator
      class="flex items-center justify-center text-current transition-none"
    >
      <Check class="size-3.5" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
