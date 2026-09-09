/**
 * /links 页面组件测试。
 *
 * 关注：友链卡片渲染、添加友链按钮与操作说明弹窗。
 * 关键点：reka-ui Dialog 内容会传送到 document.body，需要在那里查询 DOM。
 */
import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import LinksPage from "@/pages/links.vue";

async function mountAt(initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(LinksPage, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
}

async function settle() {
  for (let i = 0; i < 5; i++) {
    await nextTick();
    await flushPromises();
  }
}

describe("/links 页面", () => {
  it("渲染标题、说明与友链卡片", async () => {
    const wrapper = await mountAt("/links");
    const text = wrapper.text();
    expect(text).toContain("友链");
    expect(text).toContain("添加友链");
    // 卡片为外部链接（target=_blank + rel=noopener）
    const cards = wrapper.findAll('a[target="_blank"]');
    expect(cards.length).toBeGreaterThan(0);
    const first = cards[0];
    expect(first.attributes("href")).toBe("https://acofork.com");
    expect(first.attributes("rel")).toBe("noopener noreferrer");
    expect(first.text()).toContain("Acofork");
    // cover 封面渲染：src 与 alt 正确
    const cover = first.find("img");
    expect(cover.exists()).toBe(true);
    expect(cover.attributes("src")).toBe("https://www.acofork.com/favicon-192.png");
    expect(cover.attributes("alt")).toBe("Acofork 封面");
  });

  it("点击「添加友链」弹出操作说明：fork → 改 TOML → PR → 等审核", async () => {
    const wrapper = await mountAt("/links");
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("添加友链"))!
      .trigger("click");
    await settle();

    // reka-ui Dialog 传送到 body
    const body = document.body.textContent ?? "";
    expect(body).toContain("添加友链");
    expect(body).toContain("Fork 仓库");
    expect(body).toContain("修改 TOML");
    expect(body).toContain("提交 PR");
    expect(body).toContain("等待审核");
    // 提供直接编辑 data.toml 的入口
    expect(body).toContain("直接编辑 data.toml");
  });
});
