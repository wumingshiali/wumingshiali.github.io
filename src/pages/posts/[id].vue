<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { ArrowLeft } from "@lucide/vue";
import { getPost, type Post } from "@/lib/posts";
import { useSeo } from "@/composables/useSeo";
import TableOfContentsList from "@/components/TableOfContentsList.vue";
import MobileTocButton from "@/components/MobileTocButton.vue";
import CommentDrawer from "@/components/CommentDrawer.vue";
import CommentButton from "@/components/CommentButton.vue";

// 异步加载评论区：@giscus/vue 独立成 chunk，由 onMounted 中预拉 import 触发
const Giscus = defineAsyncComponent(() => import("@giscus/vue"));

const route = useRoute<'/posts/[id]'>();
const post = ref<Post | null>(null);
const loading = ref(true);
const error = ref<unknown>(null);

// 评论区抽屉开关：独立浮动按钮（CommentButton）点击后切换
const commentOpen = ref(false);

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
  // 预拉 Giscus chunk：进入博客详情页就开始后台下载评论组件 chunk，
  // 用户点评论按钮时 chunk 已就绪，只需等待 Giscus iframe 内部加载。
  void import("@giscus/vue");
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
  <!--
    单根组件：包一个根 div 让 App.vue 的 <Transition> 能正常动画。
    App.vue 用 <RouterView><Transition> 包装，要求每个路由组件有单一根元素。
  -->
  <div>
    <!--
      单列布局：正文 max-w-3xl 居中。桌面端目录用 fixed 定位独立在视口右侧。
    -->
    <div class="mx-auto w-full max-w-3xl px-4">
      <section class="flex flex-col gap-4">
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

          <!-- 文章底部 Giscus评论区（保留供直接访问/无 JS 用户） -->
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

      <!--
        桌面端右侧浮动栏：fixed 定位垂直居中，flex column 垂直堆叠
        - 第一个子项：CommentButton（评论按钮，在 TOC 上方）
        - 第二个子项：TOC 卡片
        - top-1/2 -translate-y-1/2：整体几何中心 = 视口中心
        - right：紧贴 max-w-7xl 容器外侧 1rem（视口 >= 80rem 时），
          否则紧贴视口右 1rem，避免与正文重叠
        - lg 以下隐藏，移动端走 MobileTocButton
        - z-30：评论区 Dialog z-50 弹出时盖在上方
      -->
      <div
        v-if="post && post.headings.length > 0"
        class="fixed top-1/2 right-[max(1rem,calc((100vw-80rem)/2+1rem))] z-30 hidden -translate-y-1/2 max-h-[calc(100vh-2rem)] w-56 flex-col items-stretch gap-3 overflow-y-auto lg:flex"
      >
        <CommentButton v-model:open="commentOpen" />
        <div
          class="overflow-y-auto rounded-lg border border-border bg-card/60 p-3 backdrop-blur"
        >
          <TableOfContentsList :headings="post.headings" />
        </div>
      </div>
    </div>

    <!--
      移动端浮动按钮 + 抽屉：lg 以下显示。
    -->
    <MobileTocButton v-if="post" :headings="post.headings" />

    <!--
      评论区 Dialog：中央悬浮（max-w-6xl + max-h-90vh），shadcn Dialog z-50
      自动高于 TOC + CommentButton 的 z-30。
    -->
    <CommentDrawer v-model:open="commentOpen" :is-dark="isDark" />
  </div>
</template>
