/**
 * TableOfContentsList 组件测试。
 * - 渲染：标题过滤、缩进、空态占位
 * - 行为：点击条目触发 scrollIntoView + history.replaceState + emit navigate
 * - active 高亮：因 happy-dom IntersectionObserver 是 noop，active 路径走不到
 *   → 此处不验证 active class，e2e 在真浏览器跑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import TableOfContentsList from "@/components/TableOfContentsList.vue";
import type { Heading } from "@/lib/posts";

const sampleHeadings: Heading[] = [
  { level: 1, text: "文章标题", slug: "article-title" },
  { level: 2, text: "章节 A", slug: "section-a" },
  { level: 3, text: "子节 A1", slug: "subsection-a1" },
  { level: 2, text: "章节 B", slug: "section-b" },
];

function mountList(props: { headings: Heading[] }) {
  return mount(TableOfContentsList, {
    props,
    attachTo: document.body,
  });
}

describe("TableOfContentsList", () => {
  beforeEach(() => {
    // 模拟目标 heading 元素存在（happy-dom 没有真实几何，scrollIntoView 也能命中）
    for (const h of sampleHeadings) {
      const el = document.createElement("h2");
      el.id = "user-content-" + h.slug;
      document.body.appendChild(el);
    }
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("过滤 h1 层级（h1 是文章标题本身，与详情页 H1 重复）", () => {
    const wrapper = mountList({ headings: sampleHeadings });
    // 4 项输入（h1 + h2 + h3 + h2）→ 过滤后剩 3 项
    expect(wrapper.findAll("li")).toHaveLength(3);
    // 第一项应是 "章节 A"（h2）
    expect(wrapper.text()).toContain("章节 A");
    expect(wrapper.text()).toContain("章节 B");
    expect(wrapper.text()).toContain("子节 A1");
    // h1 不应出现
    expect(wrapper.text()).not.toContain("文章标题");
  });

  it("按 level 缩进：h2 不缩进、h3 pl-4", () => {
    const wrapper = mountList({ headings: sampleHeadings });
    const items = wrapper.findAll("li");
    // items[0] = h2 "章节 A"
    expect(items[0].classes().join(" ")).toMatch(/pl-2/);
    // items[1] = h3 "子节 A1"
    expect(items[1].classes().join(" ")).toMatch(/pl-4/);
    // items[2] = h2 "章节 B"
    expect(items[2].classes().join(" ")).toMatch(/pl-2/);
  });

  it("全文无 h2 时保留 h1 作为目录", () => {
    const onlyH1: Heading[] = [
      { level: 1, text: "唯一 H1", slug: "only-h1" },
      { level: 1, text: "另一个 H1", slug: "another-h1" },
    ];
    const wrapper = mountList({ headings: onlyH1 });
    // 全 h1 时不过滤
    expect(wrapper.findAll("li")).toHaveLength(2);
  });

  it("点击条目调用 scrollIntoView + 写 hash + emit navigate", async () => {
    const scrollSpy = vi.fn();
    const origScroll = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollSpy;
    const replaceSpy = vi
      .spyOn(history, "replaceState")
      .mockImplementation(() => {});

    const wrapper = mountList({ headings: sampleHeadings });
    const firstLink = wrapper.find("a");
    await firstLink.trigger("click");

    expect(scrollSpy).toHaveBeenCalledOnce();
    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
    expect(replaceSpy).toHaveBeenCalledWith(null, "", "#user-content-section-a");
    // navigate 事件传给父组件（移动端 Dialog 用来关闭抽屉）
    expect(wrapper.emitted("navigate")).toBeTruthy();
    expect(wrapper.emitted("navigate")![0]).toEqual(["user-content-section-a"]);

    HTMLElement.prototype.scrollIntoView = origScroll;
    replaceSpy.mockRestore();
  });

  it("headings 为空时显示「暂无目录」占位", () => {
    const wrapper = mountList({ headings: [] });
    expect(wrapper.text()).toContain("暂无目录");
    expect(wrapper.findAll("li")).toHaveLength(0);
  });
});
