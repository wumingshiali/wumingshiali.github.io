/**
 * Cookie 同意管理（composable）。
 *
 * - 用 cookie 保存用户的选择（cookie_consent），首次访问时弹出选择器
 * - 统计类脚本（Umami / Clarity）仅在用户同意后动态加载，未同意不注入
 * - 测试环境（Vitest）不弹窗、不加载统计脚本，避免干扰现有组件测试
 */
import { ref } from "vue";

/** Cookie 同意状态 */
export interface CookieConsent {
  /** 必要 Cookie：始终开启，不可取消 */
  necessary: boolean;
  /** 统计 Cookie：Umami / Clarity */
  statistics: boolean;
}

/** 保存选择状态的 cookie 名 */
const CONSENT_COOKIE = "cookie_consent";
/** cookie 有效期：1 年 */
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

/** 统计类脚本清单：仅用户同意统计后才加载 */
const STAT_SCRIPTS: { src: string; attrs?: Record<string, string> }[] = [
  {
    src: "https://umi.meali.top/script.js",
    attrs: { "data-website-id": "27cd6b5a-15b2-4d8b-9916-1de122c60cfb" },
  },
  { src: "https://www.clarity.ms/tag/ydblo1twbo" },
];

/** 读取已保存的同意状态；无 cookie 或解析失败返回 null */
function readConsent(): CookieConsent | null {
  const match = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/);
  if (!match) return null;
  try {
    const raw = JSON.parse(decodeURIComponent(match[1])) as Partial<CookieConsent>;
    return { necessary: true, statistics: raw.statistics === true };
  } catch {
    return null;
  }
}

/** 写入同意状态到 cookie */
function writeConsent(consent: CookieConsent) {
  const value = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${CONSENT_COOKIE}=${value}; max-age=${CONSENT_MAX_AGE}; path=/; SameSite=Lax`;
}

/** 动态加载脚本（已存在则跳过，幂等） */
function loadScript(src: string, attrs: Record<string, string> = {}) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  for (const [key, value] of Object.entries(attrs)) script.setAttribute(key, value);
  document.head.appendChild(script);
}

/** 加载全部统计脚本（Umami + Clarity） */
function loadStatScripts() {
  for (const item of STAT_SCRIPTS) loadScript(item.src, item.attrs ?? {});
}

/**
 * Cookie 同意状态管理。
 *
 * @returns open 弹窗开关；statistics 统计勾选态；
 *          acceptAll / acceptNecessary / confirm 三个保存动作
 */
export function useCookieConsent() {
  const open = ref(false);
  const statistics = ref(true);
  // 首次访问（无 cookie）标记：由组件在挂载后延迟弹出，
  // 避免 SSG 预渲染把弹窗固化进静态 HTML 导致 hydrate 重复渲染
  let needsPrompt = false;

  // Vitest 环境不弹窗也不加载统计脚本，避免干扰现有组件测试
  const isTest = import.meta.env.MODE === "test";

  if (!isTest) {
    const saved = readConsent();
    if (saved) {
      statistics.value = saved.statistics;
      if (saved.statistics) loadStatScripts();
    } else {
      needsPrompt = true;
    }
  }

  function apply(consent: CookieConsent) {
    writeConsent(consent);
    statistics.value = consent.statistics;
    open.value = false;
    if (consent.statistics) loadStatScripts();
  }

  /** 接受所有 Cookies（必要 + 统计） */
  function acceptAll() {
    apply({ necessary: true, statistics: true });
  }

  /** 仅接受必要 Cookies（不加载统计脚本） */
  function acceptNecessary() {
    apply({ necessary: true, statistics: false });
  }

  /** 确认：按当前勾选状态保存 */
  function confirm() {
    apply({ necessary: true, statistics: statistics.value });
  }

  return { open, statistics, needsPrompt, acceptAll, acceptNecessary, confirm };
}
