/**
 * /posts 博客列表页组件测试。
 *
 * 关注：标题渲染、示例博客卡片展示、标签、详情页链接。
 */
import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import PostsList from "@/pages/posts/index.vue";

async function mountAt(initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  const wrapper = mount(PostsList, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await nextTick();
  await flushPromises();
  return { wrapper, router };
}

describe("/posts 博客列表页", () => {
  it("渲染标题与示例博客卡片（名称、时间）", async () => {
    const { wrapper } = await mountAt("/posts");
    expect(wrapper.text()).toContain("VoidCat的博客");
    expect(wrapper.text()).toContain("又迁移了，这次改了啥，又加了啥？？？");
    expect(wrapper.text()).toContain("2026-07-16");
  });

  it("渲染标签", async () => {
    const { wrapper } = await mountAt("/posts");
    expect(wrapper.text()).toContain("网页");
    expect(wrapper.text()).toContain("Cloudflare");
  });

  it("卡片链接到详情页 /posts/hello-world", async () => {
    const { wrapper } = await mountAt("/posts");
    const link = wrapper.find('a[href="/posts/change2cy"]');
    expect(link.exists()).toBe(true);
  });
});
