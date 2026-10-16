/**
 * 其他工具组件测试。
 *
 * 关注：
 * - 「其他」分组首页渲染随机转盘卡片
 * - 随机转盘页的两个 tab（抽取 / 大转盘）
 * - 抽取列表：默认平分、增加、删除、手动编辑占比后再增加的等比压缩
 * - 大转盘：点击「转」roll 力度并旋转，结束后给出命中结果
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import OtherIndexPage from "@/pages/tools/other/index.vue";
import WheelPage from "@/pages/tools/other/wheel.vue";

async function mountAt(component: unknown, initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(component as never, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 50));
  for (let i = 0; i < 4; i++) {
    await nextTick();
    await flushPromises();
  }
}

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll("button").find((b) => b.text().includes(label))!;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/tools/other 其他分组", () => {
  it("分组首页渲染随机转盘卡片并链接到对应路由", async () => {
    const wrapper = await mountAt(OtherIndexPage, "/tools/other");
    expect(wrapper.find('a[href="/tools/other/wheel"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("随机转盘");
  });
});

describe("/tools/other/wheel 随机转盘", () => {
  it("渲染抽取 / 大转盘两个 tab 与默认列表", async () => {
    const wrapper = await mountAt(WheelPage, "/tools/other/wheel");
    const tabs = wrapper.findAll('button[role="tab"]');
    expect(tabs.map((t) => t.text().trim())).toEqual(["抽取", "大转盘"]);
    // 默认三个选项，默认平分（33.34 / 33.33 / 33.33）
    const names = wrapper.findAll('input[aria-label^="选项名称"]');
    expect(names).toHaveLength(3);
    const ratios = wrapper.findAll('input[aria-label^="选项占比"]');
    expect(ratios.map((r) => (r.element as HTMLInputElement).value)).toEqual([
      "33.34",
      "33.33",
      "33.33",
    ]);
    // 删除按钮 + 末尾增加按钮
    expect(findButton(wrapper, "增加").exists()).toBe(true);
    expect(
      wrapper.findAll('button[aria-label^="删除"]').length,
    ).toBe(3);
  });

  it("点击增加后默认平分到新选项", async () => {
    const wrapper = await mountAt(WheelPage, "/tools/other/wheel");
    await findButton(wrapper, "增加").trigger("click");
    await settle();
    const names = wrapper.findAll('input[aria-label^="选项名称"]');
    expect(names).toHaveLength(4);
    const ratios = wrapper.findAll('input[aria-label^="选项占比"]');
    for (const r of ratios) {
      expect(Number((r.element as HTMLInputElement).value)).toBe(25);
    }
  });

  it("删除选项后列表减少并继续平分", async () => {
    const wrapper = await mountAt(WheelPage, "/tools/other/wheel");
    await wrapper.find('button[aria-label="删除 选项 A"]').trigger("click");
    await settle();
    const names = wrapper.findAll('input[aria-label^="选项名称"]');
    expect(names).toHaveLength(2);
    const ratios = wrapper.findAll('input[aria-label^="选项占比"]');
    expect(Number((ratios[0].element as HTMLInputElement).value)).toBe(50);
    expect(Number((ratios[1].element as HTMLInputElement).value)).toBe(50);
  });

  it("手动编辑占比后增加选项按比例压缩并保持合计 100", async () => {
    const wrapper = await mountAt(WheelPage, "/tools/other/wheel");
    await wrapper.findAll('input[aria-label^="选项占比"]')[0].setValue("80");
    await settle();
    await findButton(wrapper, "增加").trigger("click");
    await settle();
    const ratios = wrapper.findAll('input[aria-label^="选项占比"]');
    expect(ratios).toHaveLength(4);
    // 旧列表 [80, 33.33, 33.33] → 等比压缩 + 新项 25
    expect(Number((ratios[0].element as HTMLInputElement).value)).toBe(40.92);
    expect(Number((ratios[1].element as HTMLInputElement).value)).toBe(17.04);
    expect(Number((ratios[2].element as HTMLInputElement).value)).toBe(17.04);
    expect(Number((ratios[3].element as HTMLInputElement).value)).toBe(25);
    expect(wrapper.text()).toContain("合计 100%");
  });

  it("大转盘：点击「转」roll 力度并给出命中结果", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 力度固定为 720，命中第一个扇区
    const wrapper = await mountAt(WheelPage, "/tools/other/wheel");

    await wrapper.find('button[role="tab"]:nth-child(2)').trigger("click");
    await settle();

    const spinBtn = wrapper.find('button[aria-label="转"]');
    expect(spinBtn.exists()).toBe(true);
    await spinBtn.trigger("click");
    await settle();

    // 力度 = 720 度，每转一度消耗一个力
    expect(wrapper.text()).toContain("720");
    // 等旋转动画结束（720/360*0.5s + 缓冲）
    await new Promise((resolve) => setTimeout(resolve, 1300));
    await settle();
    expect(wrapper.text()).toContain("选项 A");
  });
});

