<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { ArrowLeft } from "@lucide/vue";
import { getPost, type Post } from "@/lib/posts";
import { useSeo } from "@/composables/useSeo";

// 异步加载评论区：@giscus/vue 独立成 chunk，仅在博客详情页首次渲染时按需下载
const Giscus = defineAsyncComponent(() => import('@giscus/vue'));

const route = useRoute<'/posts/[id]'>();
const post = ref<Post | null>(null);
const loading = ref(true);
const error = ref<unknown>(null);

// 动态 SEO 元数据：post 加载完成后自动更新 title/meta/JSON-LD
const seoTitle = computed(() => post.value?.name ?? "博客文章");
const seoDescription = computed(() => post.value?.desc ?? "阅读 VoidCat 的博客文章");
const seoImage = computed(() => post.value?.cover ?? undefined);
const seoPath = computed(() => `/posts/${route.params.id}`);
const seoPublishedTime = computed(() => post.value?.createTime ?? undefined);
const seoTags = computed(() => post.value?.tag ?? []);

useSeo({
  title: seoTitle,
  description: seoDescription,
  image: seoImage,
  path: seoPath,
  type: "article",
  publishedTime: seoPublishedTime,
  tags: seoTags,
});

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

// 监听 <html> 的 dark class 变化，同步 Giscus 主题
const isDark = ref(document.documentElement.classList.contains("dark"));
let observer: MutationObserver | null = null;

onMounted(() => {
  loadPost();
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains("dark");
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

onUnmounted(() => {
  observer?.disconnect();
});

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

      <!-- Giscus评论区 -->
      <Giscus
          repo="wumingshiali/giscus-for-blog"
          repo-id="R_kgDOR833VQ"
          category="Announcements"
          category-id="DIC_kwDOR833Vc4C6XFc"
          mapping="pathname"
          strict="0"
          reactions-enabled="1"
          emit-metadata="0"
          input-position="top"
          :theme="isDark ? 'dark' : 'light'"
          lang="zh-CN"
          loading="lazy"
        />
    </template>

    <div v-else class="flex flex-col items-center gap-2 text-muted-foreground">
      <p>找不到这篇文章</p>
      <RouterLink to="/posts" class="text-primary hover:underline">
        返回博客列表
      </RouterLink>
    </div>
  </section>
</template>
