/**
 * 中秋节彩蛋横幅组件测试。
 *
 * 关注：渲染「中秋快乐」文案、无障碍 role，以及农历数据来源标注（香港天文台）。
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import MidAutumnBanner from "@/components/MidAutumnBanner.vue";
import { HKO_LUNAR_API_DOC } from "@/lib/festival";

describe("MidAutumnBanner", () => {
  it("渲染中秋祝福文案", () => {
    const wrapper = mount(MidAutumnBanner);
    expect(wrapper.text()).toContain("中秋快乐");
  });

  it("携带 role=status 便于无障碍播报", () => {
    const wrapper = mount(MidAutumnBanner);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it("标注农历数据来源：香港天文台，并链接到 HKO API 文档", () => {
    const wrapper = mount(MidAutumnBanner);
    const link = wrapper.find("a");
    expect(link.text()).toContain("香港天文台");
    expect(link.attributes("href")).toBe(HKO_LUNAR_API_DOC);
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toContain("noopener");
  });
});
