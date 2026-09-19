<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "@lucide/vue";
import MobileNav from "@/components/MobileNav.vue";
import NationalDayBanner from "@/components/NationalDayBanner.vue";
import MidAutumnBanner from "@/components/MidAutumnBanner.vue";
import LaborDayBanner from "@/components/LaborDayBanner.vue";
import { applyMidAutumnClass, isLaborDayActive, isMidAutumnActive, isNationalDayActive } from "@/lib/festival";
import CookieConsentDialog from "@/components/CookieConsentDialog.vue";
import { navItems } from "@/lib/nav";

// 主题：dark / light，默认跟随系统偏好，选择记忆到 localStorage
const THEME_KEY = "theme";
type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const theme = ref<Theme>(getInitialTheme());
applyTheme(theme.value);

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}

watch(theme, (val) => {
  applyTheme(val);
  localStorage.setItem(THEME_KEY, val);
});

// 国庆彩蛋：日期命中国庆（10.1-10.7）或 URL 携带 ?egg=cn_birthday 时显示横幅
const nationalDayActive = isNationalDayActive();

// 劳动节彩蛋：日期命中（5.1-5.5）或 URL 携带 ?egg=cn_labor_day 时显示横幅
const laborDayActive = isLaborDayActive();

// 中秋彩蛋：异步查询香港天文台农历 API（数据来源：HKO），失败静默降级
const midAutumnActive = ref(false);
onMounted(async () => {
  const active = await isMidAutumnActive();
  midAutumnActive.value = active;
  applyMidAutumnClass(active);
});

// 桌面导航链接共用样式（普通项与「工具」入口一致，保证视觉统一）
const desktopNavLinkClass = [
  "group",
  "flex",
  "items-center",
  "gap-1.5",
  "rounded-full",
  "px-4",
  "py-1.5",
  "text-sm",
  "font-medium",
  "text-muted-foreground",
  "transition-[background-color,border-color,box-shadow]",
  "duration-150",
  "hover:text-foreground",
  "[&.router-link-active]:bg-muted",
  "[&.router-link-active]:text-foreground",
  "[&.router-link-active]:ring-1",
  "[&.router-link-active]:ring-border",
  "dark:[&.router-link-active]:bg-primary",
  "dark:[&.router-link-active]:text-primary-foreground",
];
</script>

<template>
  <div class="flex flex-1 w-full flex-col items-center gap-2">
    <!-- 主题切换：暗色显太阳(转浅)，浅色显月亮(转暗) -->
    <Button
      variant="outline"
      size="icon"
      class="fixed top-4 right-4 z-50 rounded-full bg-card/60 backdrop-blur"
      :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到暗色模式'"
      @click="toggleTheme"
    >
      <Sun v-if="theme === 'dark'" class="size-4" />
      <Moon v-else class="size-4" />
    </Button>

    <NationalDayBanner v-if="nationalDayActive" />
    <MidAutumnBanner v-if="midAutumnActive" />
    <LaborDayBanner v-if="laborDayActive" />

    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <!-- 桌面端底部中央导航（lg 及以上显示）；移动端由 MobileNav 悬浮按钮替代 -->
    <nav
      class="fixed bottom-4 left-1/2 z-50 hidden -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-border bg-card/80 p-1.5 backdrop-blur lg:flex"
    >
      <template v-for="item in navItems" :key="item.to">
        <!-- 带分组的工具入口：点击进总览页，悬停/键盘聚焦时向上弹出纵向子菜单（按分组分级） -->
        <div v-if="item.groups?.length" class="group relative">
          <RouterLink
            :to="item.to"
            :class="desktopNavLinkClass"
            aria-haspopup="menu"
          >
            <component :is="item.icon" class="nav-icon size-4" />
            {{ item.label }}
          </RouterLink>
          <div
            class="tool-dropdown invisible absolute bottom-full left-1/2 z-50 w-56 -translate-x-1/2 translate-y-1 scale-95 pb-2 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"
          >
            <!-- 内层面板；外层 pb-2 作为鼠标悬停桥接区，避免按钮与菜单之间的死区 -->
            <div
              class="rounded-2xl border border-border bg-popover/95 p-1.5 shadow-lg backdrop-blur"
            >
              <template v-for="(group, groupIndex) in item.groups" :key="group.to">
                <!-- 分组标题：可点击进入分组首页 -->
                <RouterLink
                  :to="group.to"
                  class="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
                >
                  <component :is="group.icon" class="size-3.5 shrink-0" />
                  {{ group.label }}
                </RouterLink>
                <!-- 分组内工具（缩进一级） -->
                <div class="mb-1 flex flex-col gap-0.5 border-l border-border pl-2 ml-1.5">
                  <RouterLink
                    v-for="child in group.items"
                    :key="child.to"
                    :to="child.to"
                    class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.router-link-active]:bg-muted [&.router-link-active]:text-foreground"
                  >
                    <component :is="child.icon" class="size-4 shrink-0" />
                    {{ child.label }}
                  </RouterLink>
                </div>
                <div
                  v-if="groupIndex < (item.groups?.length ?? 1) - 1"
                  class="my-1.5 h-px bg-border"
                />
              </template>
            </div>
          </div>
        </div>
        <RouterLink
          v-else
          :to="item.to"
          :class="desktopNavLinkClass"
        >
          <component :is="item.icon" class="nav-icon size-4" />
          {{ item.label }}
        </RouterLink>
      </template>
    </nav>

    <!-- 移动端左下角悬浮导航按钮 + 弹出菜单 -->
    <MobileNav />

    <!-- Cookie 选择弹窗：首次进入时出现 -->
    <CookieConsentDialog />
  </div>
</template>

<style>
/*
 * nav 图标：把激活态从「color 过渡」（触发 SVG path 重新栅格化、paint 主线程阻塞）
 * 改为「transform 缩放」（GPU 合成线程处理，CLS 友好）。
 * - hover：父 link group 触发 → scale-110
 * - active：父 link 命中 .router-link-active → scale-110
 * - transition 只针对 transform 单一属性
 */
.nav-icon {
  transition: transform 0.15s ease;
}
.group:hover .nav-icon {
  transform: scale(1.1);
}
.router-link-active .nav-icon {
  transform: scale(1.1);
}

/*
 * 工具悬停子菜单的过渡动画。
 * tw-animate-css 会在 CSS 末尾注入无层级的全局 *{transition:...}，
 * 按层叠规则压过 Tailwind 的 transition 工具类，导致 opacity/transform 动画失效。
 * 这里用普通类规则（特异性高于 *）显式声明自己的过渡，并尊重 reduced-motion。
 */
.tool-dropdown {
  transition-property: opacity, transform, translate, scale;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .tool-dropdown {
    transition: none;
  }
}
</style>
