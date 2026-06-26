<script setup lang="ts">
import type { Component } from "vue";
import { h, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Send,
  Loader2,
  MessageCircle,
  Check,
  UnlockKeyhole,
  Info,
} from "@lucide/vue";
import {
  contactSecret,
  decryptAllContacts,
  type ContactName,
} from "@/lib/contact-crypto";

// lucide 已移除品牌图标，GitHub 用内联 SVG 保留品牌识别度
const GithubIcon: Component = {
  name: "GithubIcon",
  render() {
    return h(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "currentColor",
        class: "size-5",
        "aria-hidden": "true",
      },
      [
        h("path", {
          d: "M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.11-.76.41-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.42.36.79 1.07.79 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z",
        }),
      ],
    );
  },
};

// 非加密联系方式，集中管理便于维护
const publicContacts = [
  {
    label: "GitHub",
    value: "wumingshiali",
    icon: GithubIcon,
  },
] as const;

// 加密联系方式：验证通过后一次性解密显示
const secretContacts = [
  { label: "Email", name: "email" as ContactName, icon: Mail },
  { label: "微信", name: "wechat" as ContactName, icon: MessageCircle },
] as const;

// 解密状态：locked 未验证 / revealed 已解密显示
type RevealState = "locked" | "revealed";
const revealState = ref<RevealState>("locked");
const revealed = ref<Record<string, string>>({});
const errorMessage = ref("");
const userInput = ref("");
const dialogOpen = ref(false);
const decrypting = ref(false);
// 记录点击触发的是哪个卡片，仅用于无障碍标签
const triggerLabel = ref("");

// 复制反馈：记录最近一次复制的卡片 key，用于显示"已复制"
const copiedKey = ref("");
let copyTimer: ReturnType<typeof setTimeout> | undefined;

async function copyText(key: string, text: string) {
  await navigator.clipboard?.writeText(text);
  copiedKey.value = key;
  clearTimeout(copyTimer);
  // 1.5s 后恢复，避免反馈常驻
  copyTimer = setTimeout(() => {
    copiedKey.value = "";
  }, 1500);
}

function openDialog(label: string) {
  triggerLabel.value = label;
  dialogOpen.value = true;
}

async function handleVerify() {
  const answer = userInput.value.trim();
  if (!answer) return;
  decrypting.value = true;
  errorMessage.value = "";
  try {
    // 一次验证通过，解密全部加密联系方式
    const result = await decryptAllContacts(answer);
    revealed.value = result;
    revealState.value = "revealed";
    dialogOpen.value = false;
  } catch {
    errorMessage.value = "答案不对哦，再想想喵～";
  } finally {
    decrypting.value = false;
  }
}

function resetDialog() {
  userInput.value = "";
  errorMessage.value = "";
}
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <div class="flex flex-col items-center gap-2 text-center">
      <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">联系</h1>
      <p class="text-muted-foreground">想和 VoidCat 说点什么？选个方式吧喵～</p>
    </div>

    <!-- 操作提示：点击卡片可复制 -->
    <Alert class="w-full max-w-md">
      <Info class="size-4" />
      <AlertDescription>
        点击任意卡片即可复制内容；邮箱和微信需要先通过验证喵～
      </AlertDescription>
    </Alert>

    <!-- 解密所有按钮：一次性验证解锁邮箱+微信 -->
    <Button
      v-if="revealState === 'locked'"
      size="lg"
      class="w-full max-w-md border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
      @click="openDialog('全部')"
    >
      <UnlockKeyhole class="size-4" />
      解密所有
    </Button>

    <!-- 加密联系方式卡片 -->
    <div class="grid w-full max-w-md gap-3 sm:grid-cols-2">
      <Button
        v-for="item in secretContacts"
        :key="item.name"
        variant="outline"
        size="lg"
        class="h-auto flex-col items-start gap-1 py-4 bg-card hover:bg-card/80 dark:bg-input/30 dark:hover:bg-input/50"
        @click="
          revealState === 'locked'
            ? openDialog(item.label)
            : copyText(item.name, revealed[item.name])
        "
      >
        <div class="flex w-full items-center justify-between">
          <component :is="item.icon" class="size-5" />
          <Check
            v-if="copiedKey === item.name"
            class="size-4 text-emerald-500"
          />
        </div>
        <span class="text-xs text-muted-foreground">{{ item.label }}</span>
        <span v-if="revealState === 'locked'" class="text-sm font-medium">
          点击查看
        </span>
        <span v-else-if="copiedKey === item.name" class="text-sm font-medium text-emerald-500">
          已复制
        </span>
        <span v-else class="text-sm font-medium break-all">
          {{ revealed[item.name] }}
        </span>
      </Button>
    </div>

    <!-- 公开联系方式卡片 -->
    <div class="grid w-full max-w-md gap-3 sm:grid-cols-2">
      <Button
        v-for="item in publicContacts"
        :key="item.label"
        variant="outline"
        size="lg"
        class="h-auto flex-col items-start gap-1 py-4 bg-card hover:bg-card/80 dark:bg-input/30 dark:hover:bg-input/50"
        @click="copyText(item.label, item.value)"
      >
        <div class="flex w-full items-center justify-between">
          <component :is="item.icon" />
          <Check
            v-if="copiedKey === item.label"
            class="size-4 text-emerald-500"
          />
        </div>
        <span class="text-xs text-muted-foreground">{{ item.label }}</span>
        <span v-if="copiedKey === item.label" class="text-sm font-medium text-emerald-500">
          已复制
        </span>
        <span v-else class="text-sm font-medium">{{ item.value }}</span>
      </Button>
    </div>

    <!-- 解密成功后的快捷操作 -->
    <Button
      v-if="revealState === 'revealed'"
      as="a"
      :href="`mailto:${revealed.email}`"
      size="lg"
      class="mt-2 border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
    >
      <Send class="size-4" />
      发封邮件
    </Button>

    <!-- 人机验证对话框（邮箱/微信共用） -->
    <Dialog v-model:open="dialogOpen" @update:open="(o) => !o && resetDialog()">
      <DialogContent>
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>人机验证</DialogTitle>
          <DialogDescription>
            为了防止机器人扫描，请回答下面的问题喵～
          </DialogDescription>
        </div>
        <form class="flex flex-col gap-4" @submit.prevent="handleVerify">
          <div class="flex flex-col gap-2">
            <label class="text-center text-lg font-medium">
              {{ contactSecret.question }}
            </label>
            <input
              v-model="userInput"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              autofocus
              placeholder="请输入数字答案"
              class="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-center text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p v-if="errorMessage" class="text-center text-sm text-destructive">
              {{ errorMessage }}
            </p>
          </div>
          <Button type="submit" :disabled="decrypting" class="w-full border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80">
            <Loader2 v-if="decrypting" class="size-4 animate-spin" />
            <Send v-else class="size-4" />
            {{ decrypting ? "解密中…" : "提交" }}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  </main>
</template>
