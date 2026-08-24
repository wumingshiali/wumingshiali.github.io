/**
 * /posts/[id] 详情页组件测试。
 *
 * 关注：标题、创建时间、字数、标签渲染。
 * Giscus 组件在 happy-dom 环境下会尝试 fetch 外部 URL → mount 时通过 stubs 替换，
 * 避免组件挂载时触发 NetworkError。
 */
import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import PostDetail from "@/pages/posts/[id].vue";

async function mountAt(initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  const wrapper = mount(PostDetail, {
    global: {
      plugins: [router],
      // Giscus 在 happy-dom 下 fetch 外部 URL 会抛 NetworkError，stub 掉
      stubs: {
        Giscus: defineComponent({
          name: "GiscusStub",
          setup() {
            return () => h("div", { "data-testid": "giscus-stub" });
          },
        }),
      },
    },
    attachTo: document.body,
  });
  // getPost 内部链式 await shiki/markdown-it 动态 import，需要多次 flush
  // 轮询直到 "加载中…" 文本消失，最多 20 轮
  for (let i = 0; i < 20; i++) {
    await nextTick();
    await flushPromises();
    if (!wrapper.text().includes("加载中")) break;
  }
  return { wrapper, router };
}

describe("/posts/[id] 详情页", () => {
  it("渲染标题、创建时间与字数", async () => {
    const { wrapper } = await mountAt("/posts/change2cy");
    const text = wrapper.text();
    expect(text).toContain("又迁移了，这次改了啥，又加了啥？？？");
    expect(text).toContain("2026-07-16");
    expect(text).toMatch(/\d+\s*字/);
  });
});
