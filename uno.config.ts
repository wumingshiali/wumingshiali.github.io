// uno.config.ts 配置动画预设
import { defineConfig, presetAttributify, type Preset } from 'unocss'
import presetWebFonts from '@unocss/preset-web-fonts'
import presetMini from '@unocss/preset-mini'

export default defineConfig({
  presets: [
    presetAttributify(),
    presetWebFonts({
        provider: 'google',
        fonts: {
            sans: ["Noto Sans","Noto Sans Simplified Chinese"],
            mono: 'Fira Code',
      },
    }) as Preset,
    presetMini() as Preset,
  ],
  theme: {
    // 现代紫色品牌色
    colors: {
      brand: {
        1: '#8b5cf6',
        2: '#7c3aed',
        3: '#5b21b6'
      }
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
    }
  }
})