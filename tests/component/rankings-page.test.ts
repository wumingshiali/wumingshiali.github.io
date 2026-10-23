/**
 * 排名页面组件测试。
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
    // 数据里的分类名（data.toml 单一数据源）
    expect(wrapper.text()).toContain("美食");
    expect(wrapper.text()).toContain("动漫");
    expect(wrapper.text()).toContain("游戏");
    // 卡片链接
    expect(wrapper.find('a[href="/rankings/food"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/rankings/games"]').exists()).toBe(true);
  });

  it("分类卡片展示条目数", async () => {
    const wrapper = await mountAt(RankingsIndexPage, "/rankings");
    const foodCard = wrapper.find('a[href="/rankings/food"]');
    expect(foodCard.text()).toContain("5 项");
  });
});

describe("/rankings/[id] 详情页", () => {
  it("渲染分类名与按分数降序的条目行，默认展示分数", async () => {
    const wrapper = await mountAt(RankingDetailPage, "/rankings/food");
    await settle();
    expect(wrapper.text()).toContain("美食");
    const rows = wrapper.findAll('[role="listitem"]');
    // data.toml 里美食有 5 条
    expect(rows.length).toBe(5);
    // 第一行是最高分火锅（95），最后一行是最低分
    expect(rows[0].text()).toContain("火锅");
    expect(rows[0].text()).toContain("95");
    // 默认分数模式：显示具体分数
    expect(wrapper.text()).toContain("麻辣鲜香");
    expect(wrapper.text()).toContain("聚会首选，一周能吃三次");
  });

  it("切换到「等级」显示等级文案而非分数", async () => {
    const wrapper = await mountAt(RankingDetailPage, "/rankings/food");
    await settle();
    // 切换前是分数模式，不出现等级文案
    expect(wrapper.text()).not.toContain("人上人");

    const tabs = wrapper.findAll('button[role="tab"]');
    const tierTab = tabs.find((t) => t.text().includes("等级"))!;
    await tierTab.trigger("click");
    await settle();

    // 95 → 夯（≥90）；不再出现原始分数
    expect(wrapper.text()).toContain("夯");
    expect(wrapper.text()).not.toContain("95");
    expect(wrapper.text()).toContain("拉完了"); // 55 < 60
  });

  it("未知 id 显示「排名不存在」", async () => {
    const wrapper = await mountAt(RankingDetailPage, "/rankings/does-not-exist");
    await settle();
    expect(wrapper.text()).toContain("排名不存在");
  });
});
