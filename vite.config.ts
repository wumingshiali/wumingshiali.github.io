import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Unocss from "unocss/vite";
import sharp from "sharp";
import { visualizer } from "rollup-plugin-visualizer";
import gzipPlugin from "rollup-plugin-gzip";
import brotli from "rollup-plugin-brotli";

// 使用 sharp 优化图片（含 webp 转换）
function imageOptimizePlugin() {
  return {
    name: "image-optimize-plugin",
    apply: "build",
    async generateBundle(_options, bundle) {
      const assetsToOptimize = [];

      // 收集需要优化的图片
      for (const fileName in bundle) {
        const asset = bundle[fileName];
        if (asset.type !== "asset") continue;
        const ext = fileName.split(".").pop()?.toLowerCase();
        if (!["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) continue;
        assetsToOptimize.push({ fileName, source: asset.source });
      }

      // 并行优化图片（提高编译速度）
      await Promise.all(
        assetsToOptimize.map(async ({ fileName, source }) => {
          try {
            const ext = fileName.split(".").pop()?.toLowerCase();
            let optimized;
            const img = sharp(source);

            if (ext === "png") {
              optimized = await img.png({ palette: true, compressionLevel: 9 }).toBuffer();
            } else if (ext === "gif") {
              optimized = await img.gif({ colors: 128, effort: 10 }).toBuffer();
            } else if (ext === "webp") {
              optimized = await img.webp({ quality: 100, effort: 6 }).toBuffer();
            } else {
              optimized = await img.jpeg({ mozjpeg: true, quality: 80 }).toBuffer();
            }

            bundle[fileName].source = optimized;

            // 为 PNG/JPG/GIF 额外生成 webp 版本
            if (ext && ["png", "jpg", "jpeg", "gif"].includes(ext)) {
              const webpFileName = fileName.replace(/\.[^.]+$/, ".webp");
              const webpBuffer = await sharp(source).webp({ quality: 75, effort: 6 }).toBuffer();
              bundle[webpFileName] = {
                type: "asset",
                fileName: webpFileName,
                source: webpBuffer,
              };
            }
          } catch (e) {
            console.warn(`Failed to optimize ${fileName}:`, e);
          }
        }),
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [
    vue(),
    Unocss({
      // 禁用开发时的缓存清除，提高编译速度
      devTools: false,
    }),
    imageOptimizePlugin(),
    // 仅在需要时启用打包分析
    visualizer({
      open: false,
      filename: "dist/stats.html",
      gzipSize: true,
      template: "treemap", // 更快的模板
    }),
    // Gzip 压缩
    gzipPlugin({
      filter: /\.(js|css|html|svg|json)$/,
      additionalFiles: [],
      suppressErrors: true,
    }),
    // Brotli 压缩（更好的压缩率）
    brotli({
      filter: /\.(js|css|html|svg|json)$/,
      exclude: /\.map$/,
      skipLarger: true,
    }),
  ],
  build: {
    // 目标浏览器
    target: "esnext",
    // 使用 esbuild 而不是 terser，编译速度提升 3-5x
    minify: "esbuild",
    minifyOptions: {
      drop: ["console", "debugger"],
      legalComments: "none",
    },
    // 代码分割 - 使用 CDN 后不再需要分割 vendor chunk
    rollupOptions: {
      output: {
        // 资源文件命名添加 hash
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
    // 分块大小限制
    chunkSizeWarningLimit: 500,
    // sourcemap 在生产环境关闭
    sourcemap: false,
  },
  // CSS 优化
  css: {
    devSourcemap: false,
  },
  // 预加载优化 - 预打包依赖加速冷启动
  optimizeDeps: {
    exclude: [],
  },
  // 缓存配置
  cacheDir: "node_modules/.vite",
});
