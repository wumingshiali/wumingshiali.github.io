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
