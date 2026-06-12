<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import avatarSrc from './assets/avatar.webp'
</script>

<template>
  <div id="app">
    <div id="changeTips">
      <Alert variant="destructive">
        <AlertTitle>提示</AlertTitle>
        <AlertDescription>
          你正在查看v3版本，正在开发，可能不稳定或者不好看，请见谅。
        </AlertDescription>
      </Alert>
    </div>
    <div id="baseInf">
      <div id="head">
        <Avatar class="size-48">
          <AvatarImage :src="avatarSrc"/>
          <AvatarFallback>VC</AvatarFallback>
        </Avatar>
      </div>
    </div>
  </div>
</template>
