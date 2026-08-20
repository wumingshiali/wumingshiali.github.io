import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";

/**
 * 滚动联动：监听 selector 命中的元素，返回当前「激活」的 id。
 * - rootMargin: "-80px 0px -70% 0px" 把激活区压缩到视口顶端往下 30% 一条横带，
 *   最先进入该带的 heading 被标为 active，比纯 threshold: 0 更接近「读到哪里」的体感
 * - 多个可见时取 boundingClientRect.top 最小（最靠上）
 * - onUnmounted 自动 disconnect，组件卸载无副作用
 * - selector 是函数，支持响应式变化（heading 列表来自 props/computed 时也能跟随）
 */
export function useScrollSpy(
  selector: () => string | readonly string[],
): Ref<string | null> {
  const activeId = ref<string | null>(null);
  let observer: IntersectionObserver | null = null;
  // 当前所有可见 entry 的 id → entry，用于多可见时选最靠上的
  const visible = new Map<string, IntersectionObserverEntry>();

  function pickTop() {
    let best: { id: string; top: number } | null = null;
    for (const [id, entry] of visible) {
      if (!entry.isIntersecting) continue;
      const top = entry.boundingClientRect.top;
      if (best === null || top < best.top) best = { id, top };
    }
    if (best) activeId.value = best.id;
  }

  function attach() {
    detach();
    const sel = [selector()].flat().join(", ");
    if (!sel) return;
    const targets = document.querySelectorAll<HTMLElement>(sel);
    if (targets.length === 0) return;
    visible.clear();
    activeId.value = null;
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (!id) continue;
          if (e.isIntersecting) visible.set(id, e);
          else visible.delete(id);
        }
        pickTop();
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    targets.forEach((t) => observer!.observe(t));
  }

  function detach() {
    observer?.disconnect();
    observer = null;
    visible.clear();
  }

  onMounted(attach);
  onUnmounted(detach);
  watch(selector, attach);

  return activeId;
}
