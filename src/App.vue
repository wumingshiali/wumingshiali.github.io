<script setup>

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { animate } from 'motion-v'

const aboutMe = ref(["活力", "热情", "专业", "创新"])
const codingLang = ref(["Vue", "Python", "JavaScript", "Rust", "C++", "HTML"])
const helloFromDifferentLang = ref(["你好", "Hello", "Hola", "Bonjour", "Ciao"])
const ptrAboutMe = ref(0)
const ptrCodingLang = ref(0)
const ptrHelloFromDifferentLang = ref(0)
const aboutEl = ref(null)
const codingEl = ref(null)
const helloEl = ref(null)

let interval = null

onMounted(() => {
  interval = setInterval(() => {
    ptrAboutMe.value++
    ptrCodingLang.value++
    ptrHelloFromDifferentLang.value++
  }, 1250)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

// 使用 motion-v 的 animate 函数
watch(ptrAboutMe, async () => {
  await nextTick()
  const el = aboutEl.value
  if (el) {
    animate(el, { opacity: [0, 1], y: [8, 0] }, { duration: 0.36 })
  }
}, { flush: 'post' })

watch(ptrCodingLang, async () => {
  await nextTick()
  const el = codingEl.value
  if (el) {
    animate(el, { opacity: [0, 1], y: [8, 0] }, { duration: 0.36 })
  }
}, { flush: 'post' })
  
</script>


<template>
  <div class="app-left">
    <div id="baseInfo"></div>
      <h1 class="text-[2.2em] leading-[1.1] text-brand-1 glow-1">{{ helloFromDifferentLang[ptrHelloFromDifferentLang % helloFromDifferentLang.length] }}，我是无名氏(Wumingshiali)，我是
        <span class="cycle-item" ref="aboutEl">{{ aboutMe[ptrAboutMe % aboutMe.length] }}</span>
        的开发者
      </h1>
      <h2 class="text-xl mt-4 text-brand-2 glow-2">我会的编程语言有：
        <span class="cycle-item" ref="codingEl">{{ codingLang[ptrCodingLang % codingLang.length] }}</span>
      </h2>
      <div id="myTags">
        <h3 class="text-[1.2em] mt-4 text-brand-2 glow-2">
          我是:哈基米,人,男性
        </h3>
      </div>
      <div id="meImg" class="flex items-center gap-2">
        <span class="text-[1.2em] text-brand-2 glow-2">
          这是我
        </span>
        <img src="./assets/meTheBabyCat.webp" alt="这是哈基米（我）:D" width="80" height="80" loading="lazy" decoding="async" style="object-fit: contain;" class="glow-3">
      </div>
    </div>
</template>