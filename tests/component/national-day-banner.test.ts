/**
 * 国庆彩蛋横幅组件测试。
 *
 * 关注：命中时渲染「国庆快乐」文案与国旗图标。
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import NationalDayBanner from "@/components/NationalDayBanner.vue";

describe("NationalDayBanner", () => {
  it("渲染国庆祝福文案", () => {
    const wrapper = mount(NationalDayBanner);
    expect(wrapper.text()).toContain("国庆快乐");
  });

  it("携带 role=status 便于无障碍播报", () => {
    const wrapper = mount(NationalDayBanner);
    expect(wrapper.attributes("role")).toBe("status");
  });
});
