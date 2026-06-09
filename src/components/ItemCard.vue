<script setup>
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

defineProps({
  name: {
    type: String,
    required: true,
  },
  desc: {
    type: String,
    default: '',
  },
  img: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <Card
    class="item-card w-[200px] shrink-0 overflow-hidden relative rounded-xl shadow-none border-white/15 bg-black/60"
    :class="{ 'has-img': !!img }"
  >
    <img v-if="img" :src="img" :alt="name" class="item-card-img" />
    <CardHeader :class="img ? 'item-card-overlay' : 'item-card-content'">
      <CardTitle class="item-card-name">{{ name }}</CardTitle>
      <CardDescription v-if="desc" class="item-card-desc">{{ desc }}</CardDescription>
    </CardHeader>
  </Card>
</template>

<style scoped>
.item-card.has-img {
  aspect-ratio: 1 / 1;
}

.item-card-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

/* 有图：底部渐变遮罩 */
.item-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 12px;
  gap: 4px;
}

/* 无图：静态布局 */
.item-card-content {
  padding: 12px;
  gap: 4px;
}

.item-card-name {
  font-size: 1.1em;
  font-weight: 600;
  color: inherit;
  letter-spacing: normal;
  line-height: inherit;
}

.item-card-desc {
  font-size: 0.85em;
  opacity: 0.75;
  color: inherit;
}
</style>
