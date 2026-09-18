<script setup lang="ts">
import ToolGroupIndex from "@/components/ToolGroupIndex.vue";
import { toolGroups } from "@/lib/tools";

const group = toolGroups.find((g) => g.to === "/tools/encryption")!;
</script>

<template>
  <ToolGroupIndex :group="group" />
</template>
