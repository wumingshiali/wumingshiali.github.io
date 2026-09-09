<script setup lang="ts">
import type { Component } from "vue";
import { h, ref } from "vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, Plus, ExternalLink, ArrowRight } from "@lucide/vue";
import { getAllLinks } from "@/lib/links";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "友链",
  description: "VoidCat 的友链墙。想交换友链？fork 仓库修改 TOML 并提交 PR 即可。",
  path: "/links",
});

// 本项目 GitHub 仓库地址（与 about.vue 保持一致）
const REPO_URL = "https://github.com/wumingshiali/wumingshiali.github.io";
// 友链数据文件路径：贡献者修改的就是这个文件
const LINKS_TOML = "src/links/data.toml";

// lucide 已移除品牌图标，GitHub 用内联 SVG 保留品牌识别度（与 contact.vue 一致）
const GithubIcon: Component = {
  name: "GithubIcon",
  render() {
    return h(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "currentColor",
        class: "size-5",
        "aria-hidden": "true",
      },
      [
        h("path", {
          d: "M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.11-.76.41-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.42.36.79 1.07.79 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z",
        }),
      ],
    );
  },
};

// 友链列表（已按优先级 + 首字母排序）
const links = getAllLinks();

// 封面加载失败的 URL 集合：加载失败后回退为占位图标，避免破图
const failedCovers = ref(new Set<string>());

function onCoverError(url: string) {
  failedCovers.value = new Set(failedCovers.value).add(url);
}

// 添加友链说明弹窗开关
const addDialogOpen = ref(false);

// 添加步骤：fork → 改 TOML → 提 PR → 等审核
const addSteps = [
  { title: "Fork 仓库", desc: "点击右上角 Fork，把仓库复制到你的账号下" },
  { title: "修改 TOML", desc: `编辑 ${LINKS_TOML}，在 [[links]] 列表末尾追加你的站点` },
  { title: "提交 PR", desc: "创建 Pull Request，标题以 [友链] 开头即可触发自动检测" },
  { title: "等待审核", desc: "链接检测通过后，站长会人工审核并合并" },
] as const;
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">友链</h1>
      <p class="text-muted-foreground">认识的、喜欢的、值得推荐的站点都在这喵～</p>
    </div>

    <!-- 添加友链入口：弹出操作说明 -->
    <Button
      size="lg"
      class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
      @click="addDialogOpen = true"
    >
      <Plus class="size-4" />
      添加友链
    </Button>

    <!-- 友链卡片列表：优先级优先，同级按首字母 -->
    <div
      v-if="links.length"
      class="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <a
        v-for="link in links"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-card/80"
      >
        <div
          class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-primary"
        >
          <img
            v-if="link.cover && !failedCovers.has(link.cover)"
            :src="link.cover"
            :alt="`${link.name} 封面`"
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            @error="onCoverError(link.cover)"
          />
          <Link2 v-else class="size-5" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="truncate font-semibold transition-colors group-hover:text-primary">
            {{ link.name }}
          </span>
          <span class="truncate text-xs text-muted-foreground">{{ link.url }}</span>
        </div>
        <ExternalLink class="size-4 shrink-0 text-muted-foreground/60" />
      </a>
    </div>

    <p v-else class="text-muted-foreground">还没有友链，快来占个位置喵～</p>

    <!-- 添加友链操作说明弹窗 -->
    <Dialog v-model:open="addDialogOpen">
      <DialogContent>
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>添加友链</DialogTitle>
          <DialogDescription>
            通过 GitHub Pull Request 提交你的站点，审核通过后就会出现在这里喵～
          </DialogDescription>
        </div>

        <ol class="flex flex-col gap-3">
          <li
            v-for="(step, index) in addSteps"
            :key="step.title"
            class="flex items-start gap-3"
          >
            <span
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
            >
              {{ index + 1 }}
            </span>
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium">{{ step.title }}</span>
              <span class="text-xs text-muted-foreground">{{ step.desc }}</span>
            </div>
          </li>
        </ol>

        <div class="flex flex-col gap-2">
          <Button
            as="a"
            :href="`${REPO_URL}/edit/main/${LINKS_TOML}`"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          >
            <GithubIcon />
            直接编辑 data.toml
          </Button>
          <Button
            as="a"
            :href="REPO_URL"
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            class="w-full"
          >
            <ArrowRight class="size-4" />
            查看仓库
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </main>
</template>
