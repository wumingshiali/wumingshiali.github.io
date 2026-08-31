/**
 * Vitest 全局 setup。
 *
 * - happy-dom 在 2026 版对 `matchMedia` / `ResizeObserver` 仍存在差异，
 *   reka-ui 内部组件在挂载时读这两个 API；提供空实现以避免运行时未定义错误。
 * - happy-dom 20.x 在未传 --localstorage-file 时不挂载 localStorage，
 *   App.vue 在 setup 阶段就调用 localStorage.getItem；显式注入最小实现。
 */
import { vi } from "vitest";

// @unhead/vue 在 happy-dom 中不需要真实 DOM 操作，mock 即可
// 避免组件测试因挂载 useSeo() 而报错
// - @unhead/vue 导出 useHead / useSeoMeta（composables）
// - @unhead/vue/client 导出 createHead（Vue 插件）
vi.mock("@unhead/vue", () => ({
  useHead: vi.fn(),
  useSeoMeta: vi.fn(),
}));
vi.mock("@unhead/vue/client", () => ({
  createHead: vi.fn(() => ({})),
}));

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (typeof globalThis !== "undefined" && !(globalThis as { ResizeObserver?: unknown }).ResizeObserver) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// happy-dom 不提供 IntersectionObserver；useScrollSpy 在组件 onMounted 立即注册，
// 提供 noop polyfill 避免测试环境抛 "IntersectionObserver is not defined"。
if (typeof globalThis !== "undefined" && !(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver) {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
    root = null;
    rootMargin = "";
    thresholds = [];
  };
}

// happy-dom 20.x 默认挂载的 localStorage 是个空对象 {}，缺 getItem 等方法；
// Node 22+ 的 globalThis.localStorage 需要 --localstorage-file 才可用，直接读取
// 还会打印 "localStorage is not available" ExperimentalWarning。因此不读取原值，
// 无条件用 Map 实现的最小 Storage 覆盖（满足 App.vue 在 setup 阶段读取主题记忆）。
const store = new Map<string, string>();
const localStoragePolyfill: Storage = {
  getItem(key) {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
  clear() {
    store.clear();
  },
  key(index) {
    return Array.from(store.keys())[index] ?? null;
  },
  get length() {
    return store.size;
  },
};
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: localStoragePolyfill,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: localStoragePolyfill,
  });
}

