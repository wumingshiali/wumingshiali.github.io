<script setup>
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
  <div class="item-card" :class="{ 'has-img': !!img }">
    <img v-if="img" :src="img" :alt="name" class="item-card-img" />
    <div class="item-card-content">
      <span class="item-card-name">{{ name }}</span>
      <span v-if="desc" class="item-card-desc">{{ desc }}</span>
    </div>
  </div>
</template>

<style scoped>
.item-card {
  position: relative;
  width: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

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

.item-card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-card:not(.has-img) .item-card-content {
  position: static;
  background: none;
  padding: 12px;
}

.item-card-name {
  color: inherit;
  font-size: 1.1em;
  font-weight: 600;
}

.item-card-desc {
  color: inherit;
  opacity: 0.75;
  font-size: 0.85em;
}
</style>
