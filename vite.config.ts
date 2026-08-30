/// <reference types="vitest" />
import { execSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import VueRouter from "vue-router/vite";
import htmlMinifier from "vite-plugin-html-minifier-terser";
import { compression } from "vite-plugin-compression2";
import { generateSitemap } from "./vite-plugin-sitemap.ts";
import { prerenderPosts } from "./vite-plugin-prerender-posts.ts";
import { generateRssFeed } from "./vite-plugin-rss.ts";
import { ssgPages } from "./vite-plugin-ssg.ts";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * 读取当前构建对应的 git 提交 ID（短哈希）。
 * 构建环境（本地 / CI）理应存在 git，读取失败时回退为 "unknown"，
 * 保证构建不因 git 缺失而中断。
 */
function getGitCommitId(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}
/**
 * 把 entry 入口的同步 CSS 内联到 HTML <style>，从关键路径移除额外网络请求。
 * 适用范围：HTML 中以 <link rel="stylesheet" href="/assets/xxx.css"> 形式引用的
 * 同步 CSS（即 entry CSS）。异步 chunk 的 CSS 由其 JS 动态加载，仍走外链。
 */
function inlineEntryCss(): Plugin {
  return {
    name: "inline-entry-css",
    enforce: "post",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const linkRe =
          /<link\s+[^>]*rel=["']stylesheet["'][^>]*?>/g;
        return html.replace(linkRe, (tag) => {
          const hrefMatch = tag.match(/href=["']([^"']+)["']/);
          if (!hrefMatch) return tag;
          // HTML 里是 /assets/xxx.css，bundle key 是 assets/xxx.css
          const href = hrefMatch[1].replace(/^\//, "");
          for (const [name, asset] of Object.entries(ctx.bundle)) {
            if (
              asset.type === "asset" &&
              name === href &&
              name.endsWith(".css")
            ) {
              const css = String(asset.source);
              // 已内联 → 从 bundle 移除，避免重复资源
              delete ctx.bundle[name];
              return `<style>${css}</style>`;
            }
          }
          return tag;
        });
      },
    },
  };
}

export default defineConfig({
  plugins: [
    VueRouter({
      routesFolder: "src/pages",
      dts: "src/route-map.d.ts",
    }),
    vue(),
    tailwindcss(),
    // 内联 entry CSS 到 HTML（必须早于 htmlMinifier，避免被它二次压缩耗 CPU）
    inlineEntryCss(),
    htmlMinifier({
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeAttributeQuotes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
      collapseBooleanAttributes: true,
      sortAttributes: true,
      sortClassName: true,
      ignoreCustomFragments: [/<%[\s\S]*?%>/, /\{\{[\s\S]*?\}\}/],
    }),
    compression({
      algorithms: ["gzip", "brotliCompress"],
      threshold: 1024,
      exclude: [/\.(br|gz|webp|woff2?)$/i],
      deleteOriginalAssets: false,
    }),
    generateSitemap(),
    prerenderPosts(),
    generateRssFeed(),
    ssgPages(),
  ],

  define: {
    // 构建时注入 git 提交 ID，about 页展示当前版本来源
    __GIT_COMMIT_ID__: JSON.stringify(getGitCommitId()),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  optimizeDeps: {
    include: [
      "vue",
      "reka-ui",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@noble/ciphers/webcrypto.js",
      "@noble/ciphers/aes.js",
    ],
  },

  esbuild: {
    drop: ["console", "debugger"],
    legalComments: "none",
  },

  build: {
    target: "esnext",
    minify: "terser",
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_Function: true,
        unsafe_math: true,
        unsafe_symbols: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        booleans: true,
        collapse_vars: true,
        comparisons: true,
        evaluate: true,
        inline: true,
        loops: true,
        negate_iife: true,
        properties: true,
        reduce_funcs: true,
        reduce_vars: true,
        sequences: true,
        side_effects: true,
        switches: true,
        typeofs: true,
      },
      format: {
        comments: false,
        beautify: false,
      },
      mangle: {
        toplevel: true,
        // 禁用 properties.regex 混淆：reka-ui/Vue 内部使用下划线开头的属性，
        // 混淆后会破坏 provide/inject，导致 Dialog 等组件在生产环境静默失效。
        // properties: {
        //   regex: /^_/,
        // },
      },
    },
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // 顺序敏感：从最具体到最通用，避免子串误匹配
            if (id.includes("reka-ui")) return "reka";
            if (id.includes("@vueuse/core")) return "vueuse";
            if (id.includes("shiki") || id.includes("@shikijs")) {
              // shiki 细粒度打包：核心/引擎合并为一个 chunk；
              // 各语言/主题由动态 import 自然拆分为独立 chunk
              if (id.includes("/langs/") || id.includes("/themes/")) return undefined;
              return "shiki";
            }
            if (id.includes("markdown-it")) return "md";
            if (id.includes("@noble/ciphers")) return "crypto";
            if (id.includes("unhead")) return "unhead";
            if (id.includes("@lucide")) return "lucide";
            if (id.includes("yaml")) return "md";
            // 匹配 vue / @vue/* 路径（但不匹配 vueuse、reka-ui）
            if (/[\\/]node_modules[\\/](@vue[\\/]|vue[\\/]|vue$|vue@)/.test(id)) return "vue";
            return "vendor";
          }
        },
      },
    },
  },

  // Vitest 配置：单源与构建共用。
  // include 覆盖全部 tests/，由 CLI 路径参数（test:unit / test:component /
  // test:build）决定实际跑哪些子目录；不带参数时 `pnpm test` 跑全部。
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    css: false,
    clearMocks: true,
  },
});
