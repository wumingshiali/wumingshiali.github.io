import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Unocss from "unocss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import gzipPlugin from "rollup-plugin-gzip";
import brotli from "rollup-plugin-brotli";
import htmlMinifierTerser from "vite-plugin-html-minifier-terser";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    plugins: [
      vue(),
      Unocss({ devTools: false }),
      // ✅ HTML 压缩（仅生产环境）
      isProd && htmlMinifierTerser({
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
      }),
      gzipPlugin({
        filter: /\.(js|css|html|svg|json)$/,
        suppressErrors: true,
      }),
      brotli({
        filter: /\.(js|css|html|svg|json)$/,
        exclude: /\.map$/,
        skipLarger: true,
      }),
      isProd &&
        visualizer({
          open: false,
          filename: "dist/stats.html",
          gzipSize: true,
          brotliSize: true,
          template: "treemap",
        }),
    ].filter(Boolean),

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
  };
});