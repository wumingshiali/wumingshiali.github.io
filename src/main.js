import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import 'virtual:uno.css'

// --- Umami 统计脚本 ---
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  if (!document.querySelector('script[src*="umi.meali.top"]')) {
    const script = document.createElement('script')
    script.src = 'https://umi.meali.top/script.js'
    script.setAttribute('data-website-id', '500b0f07-6e82-44b0-ae2e-202c5b8547a6')
    script.defer = true
    script.async = true
    script.onerror = () => console.warn('Umami 加载失败')
    document.body.appendChild(script)
  }
}

createApp(App).mount('#app')
