<script setup lang="ts">
import { useRouter } from "vue-router";

// 旧地址兼容：工具已移入 /tools/encryption/，此处自动跳转避免旧书签 404
const router = useRouter();
void router.replace("/tools/encryption/hash");
</script>

<template>
  <div class="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
    正在跳转到新的工具地址…
  </div>
</template>
