// uno.config.ts 配置动画预设 + shadcn 适配
import { defineConfig, presetAttributify } from 'unocss'
import { presetWind } from '@unocss/preset-wind3'
import presetAnimations from 'unocss-preset-animations'
import { presetShadcn } from 'unocss-preset-shadcn'

export default defineConfig({
  presets: [
    presetAttributify(),
    presetWind(),
    presetAnimations(),
    presetShadcn(
      { color: 'violet' },
      { componentLibrary: 'reka' },
    ),
  ],
  theme: {
    colors: {
      brand: {
        1: '#8b5cf6',
        2: '#7c3aed',
        3: '#5b21b6',
      },
    },
  },
  // 提高开发编译速度
  content: {
    pipeline: {
      // 排除不需要扫描的文件
      exclude: ['node_modules', 'dist', '.git'],
      // shadcn-vue 组件需要扫描 JS/TS 文件
      include: [
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
        '(components|src)/**/*.{js,ts}',
      ],
    },
  },
})
