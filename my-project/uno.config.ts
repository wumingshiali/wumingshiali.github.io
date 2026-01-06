// uno.config.ts 配置动画预设
import { defineConfig, presetUno, presetAttributify, type Preset } from 'unocss'
import presetWebFonts from '@unocss/preset-web-fonts'

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
  ],
  theme: {
    // 复制Vite官网的颜色系统
    colors: {
      brand: {
        1: '#3451b2',
        2: '#3a5ccc', 
        3: '#5672cd'
      }
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
    }
  }
})