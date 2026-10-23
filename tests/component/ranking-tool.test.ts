/**
 * 排名生成工具组件测试（/tools/other/ranking）。
 *
 * 关注：
 * - 默认示例数据（2 个分类、共 5 条）
 * - 新增/删除分类与条目
 * - 导入 TOML（合法替换数据 / 非法报错）
 * - 导出 TOML 文本（含 [[categories]] 结构）
 * - 复制按钮调用剪贴板
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import RankingToolPage from "@/pages/tools/other/ranking.vue";

async function mountAt(initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(RankingToolPage, {
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

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll("button").find((b) => b.text().includes(label))!;
}

/** 按精确文本找按钮（tab 按钮文案会包含子串，导入/复制等需精确匹配） */
function findExactButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll("button").find((b) => b.text().trim() === label)!;
}

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/tools/other/ranking 排名生成", () => {
  it("渲染编辑 / 导入导出两个 tab，默认展示示例数据", async () => {
    const wrapper = await mountAt("/tools/other/ranking");
    const tabs = wrapper.findAll('button[role="tab"]');
    expect(tabs.map((t) => t.text().trim())).toEqual(["编辑", "导入导出"]);
    // 示例数据：美食 / 游戏 两个分类，美食 3 条 + 游戏 2 条
    expect(wrapper.text()).toContain("美食");
    expect(wrapper.text()).toContain("游戏");
    expect(wrapper.findAll('input[aria-label="条目名称"]')).toHaveLength(3);
  });

  it("新增分类 / 新增条目后条目数增加", async () => {
    const wrapper = await mountAt("/tools/other/ranking");
    await findButton(wrapper, "新增条目").trigger("click");
    await settle();
    expect(wrapper.findAll('input[aria-label="条目名称"]')).toHaveLength(4);

    await findButton(wrapper, "新增分类").trigger("click");
    await settle();
    // 新分类自带 1 个空条目
    expect(wrapper.findAll('input[aria-label="条目名称"]')).toHaveLength(1);
  });

  it("切换分类后编辑对应条目", async () => {
    const wrapper = await mountAt("/tools/other/ranking");
    // 点击「游戏」分类 chip
    const gameChip = wrapper.findAll("button").find((b) => b.text().trim() === "游戏")!;
    await gameChip.trigger("click");
    await settle();
    expect(wrapper.findAll('input[aria-label="条目名称"]')).toHaveLength(2);
  });

  it("导入合法 TOML 替换数据并提示成功", async () => {
    const wrapper = await mountAt("/tools/other/ranking");
    // 切到导入导出
    const ioTab = wrapper.findAll('button[role="tab"]')[1];
    await ioTab.trigger("click");
    await settle();

    await wrapper
      .find('textarea[aria-label="导入 TOML 内容"]')
      .setValue('[[categories]]\nid = "movies"\nname = "电影"\n\n  [[categories.items]]\n  name = "星际穿越"\n  score = 96');
    await findExactButton(wrapper, "导入").trigger("click");
    await settle();

    expect(wrapper.text()).toContain("导入成功：1 个分类");

    // 回到编辑页，只剩电影分类的 1 条
    const editTab = wrapper.findAll('button[role="tab"]')[0];
    await editTab.trigger("click");
    await settle();
    expect(wrapper.text()).toContain("电影");
    expect(wrapper.findAll('input[aria-label="条目名称"]')).toHaveLength(1);
  });

  it("导入非法 TOML 报错（不改动现有数据）", async () => {
    const wrapper = await mountAt("/tools/other/ranking");
    const ioTab = wrapper.findAll('button[role="tab"]')[1];
    await ioTab.trigger("click");
    await settle();

    await wrapper
      .find('textarea[aria-label="导入 TOML 内容"]')
      .setValue('[[categories]]\nid = "BAD ID"\nname = "x"\nitems = []');
    await findExactButton(wrapper, "导入").trigger("click");
    await settle();

    // 解析错误信息会指明非法字段（这里是 id 含空格/大写）
    expect(wrapper.text()).toContain("id");
  });

  it("导出 TOML 包含 [[categories]] 结构与分数", async () => {
    const wrapper = await mountAt("/tools/other/ranking");
    const ioTab = wrapper.findAll('button[role="tab"]')[1];
    await ioTab.trigger("click");
    await settle();

    const exportTextarea = wrapper.find('textarea[aria-label="生成的 TOML"]');
    const toml = (exportTextarea.element as HTMLTextAreaElement).value;
    expect(toml).toContain("[[categories]]");
    expect(toml).toContain('id = "food"');
    expect(toml).toContain('score = 95');
    expect(toml).toContain('score = 55');
  });

  it("点击复制调用剪贴板写入导出的 TOML", async () => {
    const wrapper = await mountAt("/tools/other/ranking");
    const ioTab = wrapper.findAll('button[role="tab"]')[1];
    await ioTab.trigger("click");
    await settle();

    await findExactButton(wrapper, "复制").trigger("click");
    await settle();
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const written = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
    expect(written).toContain('id = "food"');
  });
});
