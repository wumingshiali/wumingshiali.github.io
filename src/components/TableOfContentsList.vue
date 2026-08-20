<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { useScrollSpy } from "@/composables/useScrollSpy";
import type { Heading } from "@/lib/posts";

interface Props {
  /** 渲染后的标题列表（来自 Post.headings） */
  headings: Heading[];
}
const props = defineProps<Props>();

const emit = defineEmits<{
  /** 移动端 Dialog 内点击条目跳转后通知父组件关闭抽屉 */
  (e: "navigate", id: string): void;
}>();

// 过滤 h1：通常 h1 是文章标题本身（与详情页顶部 H1 重复）；若全文没有 h2 才保留 h1
const toc = computed<Heading[]>(() => {
  const list = props.headings;
  if (list.length === 0) return [];
  const hasH2 = list.some((h) => h.level === 2);
  const filterLevel = hasH2
    ? (h: Heading) => h.level >= 2
    : (h: Heading) => h.level >= 1;
  return list.filter(filterLevel);
});

// 与 posts.ts heading_open 写入的 id="user-content-<slug>" 对齐
const selector = computed(() =>
  toc.value.map((h) => "#user-content-" + h.slug).join(", "),
);

const activeId = useScrollSpy(() => selector.value);

function handleClick(e: MouseEvent, slug: string) {
  e.preventDefault();
  const id = "user-content-" + slug;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // 同步 URL hash，便于复制分享
  history.replaceState(null, "", "#" + id);
  emit("navigate", id);
}
</script>

<template>
  <nav aria-label="文章目录">
    <p
      class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
    >
      目录
    </p>
    <ul v-if="toc.length > 0" class="flex flex-col gap-1 text-sm">
      <li
        v-for="h in toc"
        :key="h.slug"
        :class="
          cn(
            'truncate rounded px-2 py-1 transition-colors',
            h.level === 2 && 'pl-2',
            h.level === 3 && 'pl-4',
            h.level >= 4 && 'pl-6',
            activeId === 'user-content-' + h.slug
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
          )
        "
      >
        <a
          :href="'#user-content-' + h.slug"
          class="block truncate"
          @click="handleClick($event, h.slug)"
        >
          {{ h.text }}
        </a>
      </li>
    </ul>
    <p v-else class="text-xs text-muted-foreground">本文暂无目录</p>
  </nav>
</template>
