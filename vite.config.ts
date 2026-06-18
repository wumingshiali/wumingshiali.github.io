import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Unocss from "unocss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import gzipPlugin from "rollup-plugin-gzip";
import brotli from "rollup-plugin-brotli";
import htmlMinifierTerser from "vite-plugin-html-minifier-terser";
import { fileURLToPath, URL } from "node:url";

// 使用 NODE_ENV 判断环境，完美绕过 Wrangler 无法解析函数式 defineConfig 的 Bug
const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [
    vue(),
    Unocss({ devTools: false }),
    gzipPlugin({
      filter: /\.(js|css|html|svg|json)$/,
      suppressErrors: true,
    }),
    brotli({
      filter: /\.(js|css|html|svg|json)$/,
      exclude: /\.map$/,
      skipLarger: true,
    }),
    // Vite 构建时会自动忽略数组中的 null 或 false，无需额外的 .filter(Boolean)
    isProd ? htmlMinifierTerser({
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
    }) : null,
    isProd ? visualizer({
      open: false,
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }) : null,
  ],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  esbuild: {
    drop: isProd ? ["console", "debugger"] : [],
    legalComments: "none",
  },

  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("/vue/") ||
              id.includes("/vue-router/") ||
              id.includes("/pinia/")
            ) {
              return "vue-vendor";
            }
            return "vendor";
          }
        },
      },
    },
  },

  css: {
    devSourcemap: false,
  },
});
