<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { getAllPosts, getPost, type Post, type PostMeta } from "@/lib/posts";
import { RouterLink } from "vue-router";
import { FileText, Search } from "@lucide/vue";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const allPosts = getAllPosts();
const searchQuery = ref("");
const deepSearch = ref(false);
const deepPosts = ref<Post[]>([]);
const deepLoading = ref(false);

// 详细搜索开启时加载所有正文（首次触发 shiki 渲染，较慢）
watch(deepSearch, async (deep) => {
  if (deep && deepPosts.value.length === 0) {
    deepLoading.value = true;
    deepPosts.value = (
      await Promise.all(allPosts.map((p) => getPost(p.id)))
    ).filter((p): p is Post => p !== null);
    deepLoading.value = false;
  }
});

// 去 HTML 标签，转小写，用于正文搜索
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").toLowerCase();
}

const filteredPosts = computed<PostMeta[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return allPosts;
  // 详细搜索：标题 + 简介 + 正文
  if (deepSearch.value && deepPosts.value.length) {
    return deepPosts.value.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        stripHtml(p.content).includes(q),
    );
  }
  // 默认搜索：标题 + 简介
  return allPosts.filter(
    (p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q),
  );
});
</script>

<template>
  <section class="flex w-full flex-col gap-6">
    <h1 class="text-2xl font-bold tracking-tight text-center">VoidCat的博客</h1>

    <!-- 搜索区 -->
    <div class="flex w-full max-w-5xl mx-auto flex-col gap-2">
      <div class="relative">
        <Search
          class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="searchQuery"
          placeholder="搜索博客标题或简介..."
          class="pl-9"
        />
      </div>
      <label class="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox v-model="deepSearch" />
        详细搜索（含正文<span v-if="deepLoading">，加载中…</span>）
      </label>
    </div>

    <!-- 列表 -->
    <TransitionGroup
      v-if="filteredPosts.length"
      name="card"
      tag="div"
      class="grid grid-cols-1 gap-5 w-full max-w-5xl mx-auto"
    >
      <RouterLink
        v-for="post in filteredPosts"
        :key="post.id"
        :to="`/posts/${post.id}`"
        class="group flex flex-row overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50"
      >
        <!-- 封面缩略图：固定尺寸，不随卡片宽度变高 -->
        <div
          class="relative w-28 h-36 shrink-0 overflow-hidden bg-muted sm:w-36 sm:h-40"
        >
          <img
            v-if="post.cover"
            :src="post.cover"
            :alt="post.name"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div
            v-else
            class="flex h-full w-full items-center justify-center text-muted-foreground"
          >
            <FileText class="size-8" />
          </div>
        </div>
        <!-- 内容区：flex-1 占剩余宽度，时间靠底部 -->
        <div class="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
          <h2
            class="font-semibold leading-tight transition-colors group-hover:text-primary"
          >
            {{ post.name }}
          </h2>
          <p
            v-if="post.desc"
            class="text-sm text-muted-foreground line-clamp-2"
          >
            {{ post.desc }}
          </p>
          <div class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="t in post.tag"
              :key="t"
              class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {{ t }}
            </span>
          </div>
          <time class="mt-auto text-xs text-muted-foreground">{{
            post.createTime
          }}</time>
        </div>
      </RouterLink>
    </TransitionGroup>

    <p v-else class="text-center text-muted-foreground">没有匹配的博客</p>
  </section>
</template>
