/**
 * 排名页面组件测试（数据驱动）。
 *
 * 断言基于 src/rankings/data.toml 的实际内容推导，
 * 站长更新排名数据时无需同步修改测试。
 *
 * 关注：
 * - /rankings 目录页：分类卡片渲染并链接到详情路由
 * - /rankings/[id] 详情页：行列表按分数降序、分数/等级切换
 * - 未知 id 显示「排名不存在」
 */
import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import RankingsIndexPage from "@/pages/rankings/index.vue";
import RankingDetailPage from "@/pages/rankings/[id].vue";
import { getAllRankings, sortRankingItems, tierOf } from "@/lib/rankings";

/** 以 data.toml 的第一个分类作为断言样本 */
const rankings = getAllRankings();
const first = rankings[0];

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
  for (let i = 0; i < 5; i++) {
    await nextTick();
    await flushPromises();
  }
}

describe("/rankings 目录页", () => {
  it("渲染标题与分类卡片，卡片链接到详情路由", async () => {
    const wrapper = await mountAt(RankingsIndexPage, "/rankings");
    expect(wrapper.text()).toContain("排名");
    // 每个分类都应有对应卡片
    for (const category of rankings) {
      const card = wrapper.find(`a[href="/rankings/${category.id}"]`);
      expect(card.exists()).toBe(true);
      expect(card.text()).toContain(category.name);
    }
  });

  it("分类卡片展示条目数", async () => {
    const wrapper = await mountAt(RankingsIndexPage, "/rankings");
    const card = wrapper.find(`a[href="/rankings/${first.id}"]`);
    expect(card.text()).toContain(`${first.items.length} 项`);
  });
});

describe("/rankings/[id] 详情页", () => {
  it("渲染分类名与按分数降序的条目行，默认展示分数", async () => {
    const wrapper = await mountAt(RankingDetailPage, `/rankings/${first.id}`);
    await settle();
    expect(wrapper.text()).toContain(first.name);

    const rows = wrapper.findAll('[role="listitem"]');
    expect(rows.length).toBe(first.items.length);

    const sorted = sortRankingItems(first.items);
    // 第一行是最高分条目并显示其分数
    expect(rows[0].text()).toContain(sorted[0].name);
    expect(rows[0].text()).toContain(String(sorted[0].score));
    // 简洁 / 评价（可选字段）渲染
    if (sorted[0].brief) expect(wrapper.text()).toContain(sorted[0].brief);
    if (sorted[0].comment) expect(wrapper.text()).toContain(sorted[0].comment);
  });

  it("切换到「等级」显示等级文案而非分数", async () => {
    const wrapper = await mountAt(RankingDetailPage, `/rankings/${first.id}`);
    await settle();

    const sorted = sortRankingItems(first.items);
    const topTier = tierOf(sorted[0].score).label;
    const lastTier = tierOf(sorted[sorted.length - 1].score).label;

    // 切换前是分数模式，不出现等级文案
    expect(wrapper.text()).not.toContain(topTier);

    const tierTab = wrapper
      .findAll('button[role="tab"]')
      .find((t) => t.text().includes("等级"))!;
    await tierTab.trigger("click");
    await settle();

    const rows = wrapper.findAll('[role="listitem"]');
    // 最高分与最低分条目显示推导出的等级文案，原始分数消失
    expect(rows[0].text()).toContain(topTier);
    expect(rows[0].text()).not.toContain(String(sorted[0].score));
    if (lastTier !== topTier) {
      expect(rows[rows.length - 1].text()).toContain(lastTier);
    }
  });

  it("未知 id 显示「排名不存在」", async () => {
    const wrapper = await mountAt(RankingDetailPage, "/rankings/does-not-exist");
    await settle();
    expect(wrapper.text()).toContain("排名不存在");
  });
});
