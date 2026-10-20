/**
 * 主题预设（useThemePreset）单元测试。
 *
 * 关注：Rice/Endfield 预设的初始读取、切换持久化、<html> class 同步。
 * 注意：composable 是模块级单例，测试间通过 setPreset 重置回 rice。
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  ENDFIELD_CLASS,
  THEME_PRESET_KEY,
  getInitialThemePreset,
  useThemePreset,
} from "@/composables/useThemePreset";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove(ENDFIELD_CLASS);
});

describe("useThemePreset", () => {
  it("默认预设为 rice，且 <html> 不带 theme-endfield class", () => {
    const { preset } = useThemePreset();
    expect(preset.value).toBe("rice");
    expect(document.documentElement.classList.contains(ENDFIELD_CLASS)).toBe(false);
  });

  it("setPreset('endfield')：写入 localStorage 并给 <html> 添加 class", () => {
    const { preset, setPreset } = useThemePreset();
    setPreset("endfield");
    expect(preset.value).toBe("endfield");
    expect(localStorage.getItem(THEME_PRESET_KEY)).toBe("endfield");
    expect(document.documentElement.classList.contains(ENDFIELD_CLASS)).toBe(true);
  });

  it("setPreset('rice')：从 endfield 切回 rice 时移除 class", () => {
    const { preset, setPreset } = useThemePreset();
    setPreset("endfield");
    setPreset("rice");
    expect(preset.value).toBe("rice");
    expect(localStorage.getItem(THEME_PRESET_KEY)).toBe("rice");
    expect(document.documentElement.classList.contains(ENDFIELD_CLASS)).toBe(false);
  });

  it("getInitialThemePreset：localStorage 存 endfield 时返回 endfield", () => {
    localStorage.setItem(THEME_PRESET_KEY, "endfield");
    expect(getInitialThemePreset()).toBe("endfield");
  });

  it("getInitialThemePreset：非法值回退 rice", () => {
    localStorage.setItem(THEME_PRESET_KEY, "whatever");
    expect(getInitialThemePreset()).toBe("rice");
  });
});
