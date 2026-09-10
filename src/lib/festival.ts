/**
 * 国庆彩蛋（egg=cn_birthday）。
 *
 * 触发方式二选一：
 * 1. 日期命中国庆假期（10 月 1 日 - 10 月 7 日，含国庆黄金周）；
 * 2. URL 携带参数 ?egg=cn_birthday（任意日期均可手动触发）。
 *
 * 命中后给 <html> 添加 NATIONAL_DAY_CLASS，由 index.css 呈现红金主题；
 * 与 index.html 首屏内联脚本保持同步（后者负责首屏前防闪烁）。
 */

/** 彩蛋参数值：?egg=cn_birthday */
export const NATIONAL_DAY_EGG = "cn_birthday";

/** 命中国庆彩蛋时添加到 <html> 的 class */
export const NATIONAL_DAY_CLASS = "egg-cn-birthday";

/** 国庆假期起始日（10 月 1 日） */
const NATIONAL_DAY_START_DAY = 1;
/** 国庆假期结束日（10 月 7 日，黄金周） */
const NATIONAL_DAY_END_DAY = 7;

/** 日期是否处于国庆假期（10 月 1 日 - 10 月 7 日）。 */
export function isNationalDay(now: Date = new Date()): boolean {
  return (
    now.getMonth() === 9 &&
    now.getDate() >= NATIONAL_DAY_START_DAY &&
    now.getDate() <= NATIONAL_DAY_END_DAY
  );
}

/** 是否命中国庆彩蛋：日期命中或 URL 参数 egg=cn_birthday。 */
export function isNationalDayActive(
  search: string = typeof window === "undefined" ? "" : window.location.search,
  now: Date = new Date(),
): boolean {
  return (
    isNationalDay(now) ||
    new URLSearchParams(search).get("egg") === NATIONAL_DAY_EGG
  );
}

/** 按命中状态给 <html> 添加/移除国庆彩蛋 class（幂等）。 */
export function applyNationalDayClass(
  active: boolean = isNationalDayActive(),
): void {
  document.documentElement.classList.toggle(NATIONAL_DAY_CLASS, active);
}
