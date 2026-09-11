/**
 * 节日彩蛋（劳动节 egg=cn_labor_day / 国庆 egg=cn_birthday / 中秋 egg=cn_mid_autumn）。
 *
 * 触发方式均为二选一：
 * 1. 日期命中（国庆 10.1-10.7；中秋由香港天文台农历 API 判断当日是否农历八月十五）；
 * 2. URL 携带对应参数（任意日期均可手动触发）。
 *
 * 命中后给 <html> 添加对应 CLASS，由 index.css 呈现节日主题；
 * 与 index.html 首屏内联脚本保持同步（后者负责首屏前防闪烁）。
 */

/* ===== 劳动节 ===== */

/** 彩蛋参数值：?egg=cn_labor_day */
export const LABOR_DAY_EGG = "cn_labor_day";

/** 命中劳动节彩蛋时添加到 <html> 的 class */
export const LABOR_DAY_CLASS = "egg-labor-day";

/** 劳动节假期起始日（5 月 1 日） */
const LABOR_DAY_START_DAY = 1;
/** 劳动节假期结束日（5 月 5 日，五一假期） */
const LABOR_DAY_END_DAY = 5;

/** 日期是否处于劳动节假期（5 月 1 日 - 5 月 5 日）。 */
export function isLaborDay(now: Date = new Date()): boolean {
  return (
    now.getMonth() === 4 &&
    now.getDate() >= LABOR_DAY_START_DAY &&
    now.getDate() <= LABOR_DAY_END_DAY
  );
}

/** 是否命中劳动节彩蛋：日期命中或 URL 参数 egg=cn_labor_day。 */
export function isLaborDayActive(
  search: string = typeof window === "undefined" ? "" : window.location.search,
  now: Date = new Date(),
): boolean {
  return (
    isLaborDay(now) ||
    new URLSearchParams(search).get("egg") === LABOR_DAY_EGG
  );
}

/** 按命中状态给 <html> 添加/移除劳动节彩蛋 class（幂等）。 */
export function applyLaborDayClass(
  active: boolean = isLaborDayActive(),
): void {
  document.documentElement.classList.toggle(LABOR_DAY_CLASS, active);
}

/* ===== 国庆 ===== */

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

/* ===== 中秋（农历转换采用香港天文台公开数据）===== */

/** 彩蛋参数值：?egg=cn_mid_autumn */
export const MID_AUTUMN_EGG = "cn_mid_autumn";

/** 命中秋彩蛋时添加到 <html> 的 class */
export const MID_AUTUMN_CLASS = "egg-mid-autumn";

/** 香港天文台农历日期 API */
export const HKO_LUNAR_API =
  "https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php";

/** 香港天文台开放数据 API 文档（数据来源标注链接） */
export const HKO_LUNAR_API_DOC =
  "https://www.hko.gov.hk/en/weatherAPI/doc/files/HKO_Open_Data_API_Documentation.htm";

/** HKO API 响应体 */
export interface LunarDateData {
  LunarYear: string;
  LunarDate: string;
}

/** 农历日期是否为中秋节（农历八月十五，闰月不算）。 */
export function isMidAutumnLunarDate(lunarDate: string): boolean {
  return lunarDate === "八月十五";
}

/** 是否命中 URL 参数 egg=cn_mid_autumn（同步判断，无需请求 API）。 */
export function isMidAutumnParamActive(
  search: string = typeof window === "undefined" ? "" : window.location.search,
): boolean {
  return new URLSearchParams(search).get("egg") === MID_AUTUMN_EGG;
}

/** 把 Date 格式化为 HKO API 要求的 YYYY-MM-DD。 */
export function formatApiDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 请求香港天文台农历 API，返回当日农历数据。
 * 网络/解析失败时返回 null（静默降级，不触发彩蛋）。
 * fetcher 参数便于单元测试注入 mock。
 */
export async function fetchLunarDate(
  now: Date = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<LunarDateData | null> {
  try {
    const res = await fetcher(`${HKO_LUNAR_API}?date=${formatApiDate(now)}`, {
      // 第三方 API 加超时兜底，避免长时间挂起
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as LunarDateData;
    if (typeof data?.LunarDate !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 是否命中秋彩蛋：URL 参数 egg=cn_mid_autumn（短路，不发请求），
 * 否则请求香港天文台 API 判断当日是否为农历八月十五。
 */
export async function isMidAutumnActive(
  search: string = typeof window === "undefined" ? "" : window.location.search,
  now: Date = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (isMidAutumnParamActive(search)) return true;
  const data = await fetchLunarDate(now, fetcher);
  return data ? isMidAutumnLunarDate(data.LunarDate) : false;
}

/** 按命中状态给 <html> 添加/移除中秋彩蛋 class（幂等）。 */
export function applyMidAutumnClass(active: boolean): void {
  document.documentElement.classList.toggle(MID_AUTUMN_CLASS, active);
}
