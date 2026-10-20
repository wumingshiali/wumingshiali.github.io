/**
 * 主题预设（composable）：Rice（默认）/ Endfield（终末地风格）。
 *
 * - 与明暗模式（App.vue 的 theme: dark/light）正交：两套预设各自支持明/暗
 * - 选择记忆到 localStorage（theme-preset），刷新后保持
 * - Endfield 预设时给 <html> 添加 theme-endfield class，由 index.css 呈现
 * - 与 index.html 首屏内联脚本保持同步（后者负责首屏前防闪烁）
 */
import { ref } from "vue";

/** 主题预设：rice（默认）/ endfield（终末地） */
export type ThemePreset = "rice" | "endfield";

/** 保存主题预设的 localStorage key */
export const THEME_PRESET_KEY = "theme-preset";

/** Endfield 预设时添加到 <html> 的 class */
export const ENDFIELD_CLASS = "theme-endfield";

/** 读取已保存的预设；无保存或值非法时回退 rice */
export function getInitialThemePreset(): ThemePreset {
  const saved = localStorage.getItem(THEME_PRESET_KEY);
  return saved === "endfield" ? "endfield" : "rice";
}

/** 按预设给 <html> 添加/移除 Endfield class（幂等） */
export function applyThemePreset(preset: ThemePreset): void {
  document.documentElement.classList.toggle(ENDFIELD_CLASS, preset === "endfield");
}

/**
 * 主题预设状态管理（单例共享，跨组件/页面同步）。
 *
 * @returns preset 当前预设；setPreset 切换并持久化
 */
const preset = ref<ThemePreset>(getInitialThemePreset());
applyThemePreset(preset.value);

export function useThemePreset() {
  function setPreset(next: ThemePreset) {
    preset.value = next;
    applyThemePreset(next);
    localStorage.setItem(THEME_PRESET_KEY, next);
  }

  return { preset, setPreset };
}
