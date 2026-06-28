<script setup lang="ts">
import type { Component } from "vue";
import { h, onMounted, ref } from "vue";
import { Button } from "@/components/ui/button";
import cfLogo from "@/assets/cf.webp";

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

// 本项目 GitHub 仓库地址
const repoUrl = "https://github.com/wumingshiali/wumingshiali.github.io";

// Cloudflare 官网
const cloudflareUrl = "https://www.cloudflare.com";

// 页面加载用时（ms）：null 表示尚未采集到或浏览器不支持
const loadDuration = ref<number | null>(null);
// 浏览器实际协商的 HTTP 协议版本（已映射为用户可读的 HTTP/2、HTTP/3 形式）
const httpProtocol = ref("");
// 首字节延迟 TTFB（ms）：从发起请求到收到第一个响应字节的耗时
const ttfb = ref<number | null>(null);

/**
 * 把 PerformanceResourceTiming.nextHopProtocol 的原始值（如 "h2" / "h3" /
 * "http/2+quic/43"）映射为对用户友好的 HTTP/2、HTTP/3 字符串。
 * 识别不到时返回原始字符串的大写形式，避免展示乱码。
 */
function formatProtocol(raw: string): string {
  if (!raw) return "";
  if (raw === "h3" || raw.startsWith("h3-")) return "HTTP/3";
  if (raw === "h2" || raw === "http/2") return "HTTP/2";
  if (raw === "http/1.1") return "HTTP/1.1";
  return raw.toUpperCase();
}

onMounted(() => {
  // SSR / 老浏览器兜底：performance.getEntriesByType 可能不存在
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return;
  }

  // 入口文档的 navigation 条目 = 当前页主文档的协商结果，语义最准
  const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  const nav = navEntries[0];
  if (nav) {
    // loadEventEnd 为 0 表示页面还在加载中，此时不展示用时；
    // startTime 在标准里就是 0（相对 time origin），不再额外要求
    if (nav.loadEventEnd > 0) {
      loadDuration.value = Math.round(nav.loadEventEnd - nav.startTime);
    }
    // TTFB：responseStart - requestStart；responseStart 为 0 表示还没收到首字节
    if (nav.responseStart > 0 && nav.requestStart > 0) {
      ttfb.value = Math.round(nav.responseStart - nav.requestStart);
    }
    // nextHopProtocol 字段在导航条目中同样存在，TS 上是 PerformanceResourceTiming 才有
    const proto = (nav as unknown as PerformanceResourceTiming).nextHopProtocol;
    if (proto) {
      httpProtocol.value = formatProtocol(proto);
    }
  }
});
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">关于</h1>

    <!-- 项目仓库：浅色描边款，与联系页按钮风格一致 -->
    <Button
      as="a"
      :href="repoUrl"
      target="_blank"
      rel="noopener noreferrer"
      size="lg"
      class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
    >
      <GithubIcon />
      GitHub 仓库
    </Button>

    <!-- 性能与安全由 Cloudflare 提供 -->
    <a
      :href="cloudflareUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>性能与安全由</span>
      <img
        :src="cfLogo"
        alt="Cloudflare"
        class="h-5 w-auto shrink-0"
        decoding="async"
        width="118"
        height="59"
      />
      <span class="font-medium">Cloudflare</span>
      <span>提供</span>
    </a>

    <!-- 当前页传输协议、延迟与加载用时（仅在能采集到时展示） -->
    <p
      v-if="loadDuration !== null || httpProtocol || ttfb !== null"
      class="text-xs text-muted-foreground tabular-nums"
      aria-label="页面传输与加载信息"
    >
      <span v-if="httpProtocol">{{ httpProtocol }}</span>
      <span v-if="httpProtocol && (ttfb !== null || loadDuration !== null)"> · </span>
      <span v-if="ttfb !== null">延迟 {{ ttfb }} ms</span>
      <span v-if="ttfb !== null && loadDuration !== null"> · </span>
      <span v-if="loadDuration !== null">加载 {{ loadDuration }} ms</span>
    </p>
  </main>
</template>
