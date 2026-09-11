/**
 * 劳动节彩蛋横幅组件测试。
 *
 * 关注：渲染「劳动人民万岁」文案与无障碍 role。
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import LaborDayBanner from "@/components/LaborDayBanner.vue";

describe("LaborDayBanner", () => {
  it("渲染劳动节祝福文案", () => {
    const wrapper = mount(LaborDayBanner);
    expect(wrapper.text()).toContain("劳动人民万岁");
  });

  it("携带 role=status 便于无障碍播报", () => {
    const wrapper = mount(LaborDayBanner);
    expect(wrapper.attributes("role")).toBe("status");
  });
});
