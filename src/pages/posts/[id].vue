<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { ArrowLeft } from "@lucide/vue";
import { getPost, type Post } from "@/lib/posts";

const route = useRoute();
const post = ref<Post | null>(null);
const loading = ref(true);
const error = ref<unknown>(null);

async function loadPost() {
  loading.value = true;
  error.value = null;
  try {
    const id = route.params.id as string;
    post.value = await getPost(id);
  } catch (e) {
    error.value = e;
    post.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(loadPost);
// 同组件不同 id 时重新加载
watch(() => route.params.id, loadPost);
</script>

<template>
  <section class="flex w-full max-w-3xl mx-auto flex-col gap-4">
    <RouterLink
      to="/posts"
      class="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      返回列表
    </RouterLink>

    <div v-if="loading" class="text-muted-foreground">加载中…</div>

    <div v-else-if="error" class="text-destructive">
      加载失败：{{ String(error) }}
    </div>

    <template v-else-if="post">
      <img
        v-if="post.cover"
        :src="post.cover"
        :alt="post.name"
        class="aspect-video w-full max-w-2xl rounded-xl object-cover mx-auto"
      />
      <h1 class="text-3xl font-bold tracking-tight">{{ post.name }}</h1>
      <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <time>{{ post.createTime }}</time>
        <span
          v-for="t in post.tag"
          :key="t"
          class="rounded-full bg-muted px-2 py-0.5 text-xs"
        >
          {{ t }}
        </span>
      </div>
      <!-- 正文：prose 排版 + shiki 高亮 -->
      <div class="prose dark:prose-invert max-w-none" v-html="post.content" />
    </template>

    <div v-else class="flex flex-col items-center gap-2 text-muted-foreground">
      <p>找不到这篇文章</p>
      <RouterLink to="/posts" class="text-primary hover:underline">
        返回博客列表
      </RouterLink>
    </div>
  </section>
</template>
