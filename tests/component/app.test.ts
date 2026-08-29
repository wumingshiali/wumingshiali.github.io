/**
 * App shell + 路由导航测试。
 *
 * 关注：首页渲染、底部导航、路由切换。
 * 注意：App.vue 用 <Transition mode="out-in"> 包裹 RouterView，
 *       happy-dom 不真正播放动画，但仍要走 onAfterEnter 钩子，
 *       单纯 flushPromises 不够；通过调 router.push 并多轮 nextTick
 *       等待过渡完成。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { nextTick } from "vue";
import { routes } from "vue-router/auto-routes";
import App from "@/App.vue";

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

async function mountAt(initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  const wrapper = mount(App, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  // 等 Transition 钩子完成
  await nextTick();
  await flushPromises();
  await nextTick();
  return { wrapper, router };
}

async function waitTransitionSettled() {
  // Transition mode="out-in" 至少两轮 nextTick（leave + enter）
  for (let i = 0; i < 5; i++) {
    await nextTick();
    await flushPromises();
  }
}

describe("App shell", () => {
  it("'/' 渲染 VoidCat 主页", async () => {
    const { wrapper } = await mountAt("/");
    expect(wrapper.text()).toContain("VoidCat");
  });

  it("'/' 包含底部导航的「主页」与「联系」链接", async () => {
    const { wrapper } = await mountAt("/");
    const links = wrapper.findAll("a").map((a) => a.text());
    expect(links.some((t) => t.includes("主页"))).toBe(true);
    expect(links.some((t) => t.includes("联系"))).toBe(true);
  });

  it("调 router.push('/contact') 切换到联系页面", async () => {
    const { wrapper, router } = await mountAt("/");
    await router.push("/contact");
    await waitTransitionSettled();
    expect(wrapper.text()).toContain("想和 VoidCat 说点什么");
  });
});

describe("移动端悬浮导航（MobileNav）", () => {
  it("渲染左下角悬浮按钮，带「打开导航菜单」无障碍标签", async () => {
    const { wrapper } = await mountAt("/");
    const trigger = wrapper.find('button[aria-label="打开导航菜单"]');
    expect(trigger.exists()).toBe(true);
  });

  it("点击按钮展开菜单：纵向排列四个导航项", async () => {
    const { wrapper } = await mountAt("/");
    await wrapper.find('button[aria-label="打开导航菜单"]').trigger("click");
    await nextTick();
    await flushPromises();

    // Popover 内容传送到 document.body
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const labels = Array.from(dialog!.querySelectorAll("a")).map(
      (a) => a.textContent?.trim() ?? "",
    );
    expect(labels).toEqual(["主页", "联系", "博客", "关于"]);
  });

  it("点击菜单项：链接指向对应路由并收起菜单", async () => {
    const { wrapper, router } = await mountAt("/");
    await wrapper.find('button[aria-label="打开导航菜单"]').trigger("click");
    await nextTick();
    await flushPromises();

    const dialog = document.body.querySelector('[role="dialog"]')!;
    const link = Array.from(dialog.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("联系"),
    )!;
    // RouterLink 渲染出 href，保证点击目标路由正确
    expect(link.getAttribute("href")).toBe("/contact");

    // 点击菜单项后菜单自动收起（回退为悬浮按钮）
    // 注：happy-dom 下 RouterLink 点击不会完成路由跳转（既有环境限制，
    // 桌面导航链接同样如此）；路由切换本身由上方「调 router.push」用例覆盖。
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await nextTick();
    await flushPromises();
    await nextTick();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("点击弹出层之外的地方：菜单收起，导航不跳转", async () => {
    const { wrapper, router } = await mountAt("/");
    await wrapper.find('button[aria-label="打开导航菜单"]').trigger("click");
    await nextTick();
    await flushPromises();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();

    // 模拟点击主题切换按钮（弹出层外部）：pointerdown 触发 dismissable 关闭
    wrapper.find('button[aria-label*="模式"]').element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();
    await nextTick();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(router.currentRoute.value.path).toBe("/");
  });
});
