import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import htmlMinifier from "vite-plugin-html-minifier-terser";
import { compression } from "vite-plugin-compression2";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    plugins: [
      vue(),
      tailwindcss(),
      isProd &&
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
      isProd &&
        compression({
          algorithms: ["gzip", "brotliCompress"],
          threshold: 1024,
          exclude: [/\.(br|gz|webp|woff2?)$/i],
          deleteOriginalAssets: false,
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },

    optimizeDeps: {
      include: [
        "vue",
        "reka-ui",
        "@vueuse/core",
        "clsx",
        "tailwind-merge",
        "class-variance-authority",
      ],
    },

    esbuild: {
      drop: isProd ? ["console", "debugger"] : [],
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
          properties: {
            regex: /^_/,
          },
        },
      },
      cssMinify: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          indent: false,
          compact: true,
          entryFileNames: "assets/[name].[hash].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[hash].[ext]",
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("reka-ui")) return "reka";
              if (id.includes("@vueuse")) return "vueuse";
              if (id.includes("vue")) return "vue";
              return "vendor";
            }
          },
        },
      },
    },
  };
});
