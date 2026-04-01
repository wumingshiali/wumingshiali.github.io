import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import sharp from 'sharp'

// 使用 sharp 优化图片（含 webp 转换）
function imageOptimizePlugin() {
  return {
    name: 'image-optimize-plugin',
    apply: 'build',
    async generateBundle(_options, bundle) {
      const assetsToOptimize = []

      // 收集需要优化的图片
      for (const fileName in bundle) {
        const asset = bundle[fileName]
        if (asset.type !== 'asset') continue
        const ext = fileName.split('.').pop()?.toLowerCase()
        if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) continue
        assetsToOptimize.push({ fileName, source: asset.source })
      }

      // 优化并生成 webp
      for (const { fileName, source } of assetsToOptimize) {
        try {
          const image = sharp(source)
          const ext = fileName.split('.').pop()?.toLowerCase()

          // 优化原格式
          let optimized
          if (ext === 'png') {
            optimized = await image.png({ palette: true, compressionLevel: 9 }).toBuffer()
          } else if (ext === 'gif') {
            optimized = await image.gif({ colors: 256, effort: 10 }).toBuffer()
          } else if (ext === 'webp') {
            optimized = await image.webp({ quality: 100, effort: 10 }).toBuffer()
          } else {
            optimized = await image.jpeg({ mozjpeg: true, quality: 100 }).toBuffer()
          }

          // 更新原文件
          bundle[fileName].source = optimized

          // 为 PNG/JPG/GIF 额外生成 webp 版本
          if (ext && ['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
            const webpFileName = fileName.replace(/\.[^.]+$/, '.webp')
            const webpBuffer = await sharp(source).webp({ quality: 100, effort: 10 }).toBuffer()
            bundle[webpFileName] = {
              type: 'asset',
              fileName: webpFileName,
              source: webpBuffer,
            }
          }
        } catch (e) {
          console.warn(`Failed to optimize ${fileName}:`, e)
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), Unocss(), imageOptimizePlugin()],
})
