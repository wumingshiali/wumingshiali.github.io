// uno.config.ts 配置动画预设
import { defineConfig, presetAttributify } from 'unocss'
import presetUno from '@unocss/preset-uno'

export default defineConfig({
  presets: [
    presetAttributify(),
    presetUno(),
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
})
