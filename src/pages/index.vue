<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSeo } from "@/composables/useSeo";

const avatarSrc = "/avatar-52491de8.webp";

useSeo({
  title: "个人主页",
  description: "开源即自由，自由即万物。Open source is freedom. Freedom builds the world.",
  path: "/",
});
</script>

<template>
  <div id="baseInf" class="mt-6 flex flex-col items-center gap-5">
    <div id="head">
      <Avatar
        class="size-48 ring-2 ring-border/60 ring-offset-4 ring-offset-background shadow-lg shadow-black/30 transition-transform duration-300 hover:scale-[1.02]"
      >
        <AvatarImage
          :src="avatarSrc"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          width="192"
          height="192"
        />
        <AvatarFallback>VC</AvatarFallback>
      </Avatar>
    </div>
    <div id="name" class="flex flex-col items-center gap-2">
      <h1 class="text-5xl font-medium tracking-tight sm:text-6xl">VoidCat</h1>
      <div class="flex flex-col items-center gap-1 text-center">
        <p class="text-lg font-medium text-muted-foreground sm:text-xl">
          开源即自由，自由即万物
        </p>
        <p class="text-sm italic text-muted-foreground/70 sm:text-base">
          Open source is freedom. Freedom builds the world.
        </p>
      </div>
    </div>
  </div>
</template>
