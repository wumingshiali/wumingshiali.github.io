import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import { Plugin } from 'vite'
import path from 'path'
import zlib from 'zlib'
import fs from 'fs'
import sharp from 'sharp'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Unocss()
    // 构建插件仅在 npm run build 时启用（apply: 'build' 限制）
    // 开发时禁用以确保稳定性
  ],
})
