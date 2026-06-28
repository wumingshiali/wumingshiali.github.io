/**
 * /about 页面组件测试。
 *
 * 关注：HTTP 协议版本、TTFB 延迟与加载用时的渲染。
 * 关键点：onMounted 中读取 PerformanceNavigationTiming；测试环境默认无
 * nextHopProtocol，需要用 vi.spyOn 注入 mock。空数据时 v-if 守卫生效，
 * 信息条不应渲染。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import AboutPage from "@/pages/about.vue";

async function mountAt(initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(AboutPage, { global: { plugins: [router] } });
}

/** 构造一个完整的 navigation mock；任何字段不传则走默认 0。 */
function mockNavigationEntry(entry: Partial<PerformanceNavigationTiming>) {
  return vi.spyOn(performance, "getEntriesByType").mockImplementation((type) => {
    if (type === "navigation") {
      return [entry as PerformanceNavigationTiming];
    }
    return [];
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/about 页面：传输与加载信息", () => {
  it("HTTP/3 + TTFB + 加载用时：三项均渲染", async () => {
    mockNavigationEntry({
      startTime: 0,
      requestStart: 10,
      responseStart: 55, // TTFB = 55 - 10 = 45 ms
      loadEventEnd: 234.6, // 加载用时 = 234.6 - 0 ≈ 235 ms
      nextHopProtocol: "h3",
    } as PerformanceNavigationTiming);

    const wrapper = await mountAt("/about");
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain("HTTP/3");
    expect(text).toContain("延迟 45 ms");
    expect(text).toContain("加载 235 ms");
  });

  it("HTTP/2 映射：raw = h2 时应展示为 HTTP/2", async () => {
    mockNavigationEntry({
      startTime: 0,
      requestStart: 5,
      responseStart: 30,
      loadEventEnd: 100,
      nextHopProtocol: "h2",
    } as PerformanceNavigationTiming);

    const wrapper = await mountAt("/about");
    await nextTick();

    expect(wrapper.text()).toContain("HTTP/2");
  });

  it("Firefox 风格协议：raw = 'http/2+quic/43' 走 fallback 大写展示", async () => {
    mockNavigationEntry({
      startTime: 0,
      requestStart: 0,
      responseStart: 50,
      loadEventEnd: 180,
      nextHopProtocol: "http/2+quic/43",
    } as PerformanceNavigationTiming);

    const wrapper = await mountAt("/about");
    await nextTick();

    const text = wrapper.text();
    // 该原始串未命中已知映射，按 fallback 走 toUpperCase
    expect(text).toContain("HTTP/2+QUIC/43");
  });

  it("边界：loadEventEnd 为 0 时不展示用时，但协议与延迟仍展示", async () => {
    mockNavigationEntry({
      startTime: 0,
      requestStart: 10,
      responseStart: 80,
      loadEventEnd: 0,
      nextHopProtocol: "h3",
    } as PerformanceNavigationTiming);

    const wrapper = await mountAt("/about");
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain("HTTP/3");
    expect(text).toContain("延迟 70 ms"); // 80 - 10
    expect(text).not.toContain("加载");
  });

  it("边界：responseStart 为 0 时不展示延迟，但协议与加载用时仍展示", async () => {
    mockNavigationEntry({
      startTime: 0,
      requestStart: 10,
      responseStart: 0, // 还没收到首字节
      loadEventEnd: 234,
      nextHopProtocol: "h3",
    } as PerformanceNavigationTiming);

    const wrapper = await mountAt("/about");
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain("HTTP/3");
    expect(text).toContain("加载 234 ms");
    expect(text).not.toContain("延迟");
  });

  it("边界：mock 返回空数组时整段信息条不渲染（v-if 守卫）", async () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([] as PerformanceEntry[]);

    const wrapper = await mountAt("/about");
    await nextTick();

    const infoLine = wrapper.find('[aria-label="页面传输与加载信息"]');
    expect(infoLine.exists()).toBe(false);
  });
});
