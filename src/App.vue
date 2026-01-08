<script setup>

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { animate } from 'motion-v'

const aboutMe = ref(["活力", "热情", "专业", "创新"])
const codingLang = ref(["Vue", "Python", "JavaScript", "Rust", "C++", "HTML"])
const ptrAboutMe = ref(0)
const ptrCodingLang = ref(0)

const aboutEl = ref(null)
const codingEl = ref(null)

let interval = null

onMounted(() => {
  interval = setInterval(() => {
    ptrAboutMe.value++
    ptrCodingLang.value++
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
  <h1 class="text-[3.2em] leading-[1.1] text-brand-1">你好，我是无名氏(Wumingshiali)，我是
    <span class="cycle-item" ref="aboutEl">{{ aboutMe[ptrAboutMe % aboutMe.length] }}</span>
    的开发者
  </h1>
  <h2 class="text-2xl mt-4 text-brand-2">我会的编程语言有：
    <span class="cycle-item" ref="codingEl">{{ codingLang[ptrCodingLang % codingLang.length] }}</span>
  </h2>
</template>