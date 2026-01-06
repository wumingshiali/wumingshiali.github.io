<script setup>

import { ref, reactive } from 'vue'
const aboutMe = ref("充满活力") // 还有热情，专业，创新等待动态改变代码实现
const codingLang = ref("Vue") // 还有Python，js，Rust，C++，html等待动态改变代码实现

</script>


<template>
  <h1>你好，我是无名氏(Wumingshiali)，我是{{ aboutMe }}的开发者</h1>
</template>