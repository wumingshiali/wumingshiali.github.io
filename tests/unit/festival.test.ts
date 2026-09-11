/**
 * 节日彩蛋检测逻辑单元测试。
 *
 * 关注：
 * - 国庆：日期边界（10.1-10.7）、URL 参数 egg=cn_birthday 触发、class 增删幂等
 * - 中秋：香港天文台农历 API（八月十五判断）、参数 egg=cn_mid_autumn、失败静默降级
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyMidAutumnClass,
  applyNationalDayClass,
  fetchLunarDate,
  formatApiDate,
  isMidAutumnActive,
  isMidAutumnLunarDate,
  isMidAutumnParamActive,
  isNationalDay,
  isNationalDayActive,
  MID_AUTUMN_CLASS,
  NATIONAL_DAY_CLASS,
} from "@/lib/festival";

afterEach(() => {
  document.documentElement.classList.remove(NATIONAL_DAY_CLASS);
  document.documentElement.classList.remove(MID_AUTUMN_CLASS);
});

describe("isNationalDay（日期窗口 10.1 - 10.7）", () => {
  it("10 月 1 日返回 true", () => {
    expect(isNationalDay(new Date(2026, 9, 1))).toBe(true);
  });

  it("10 月 7 日返回 true", () => {
    expect(isNationalDay(new Date(2026, 9, 7))).toBe(true);
  });

  it("10 月 8 日返回 false", () => {
    expect(isNationalDay(new Date(2026, 9, 8))).toBe(false);
  });

  it("9 月 30 日返回 false", () => {
    expect(isNationalDay(new Date(2026, 8, 30))).toBe(false);
  });

  it("其它月份（如 1 月）返回 false", () => {
    expect(isNationalDay(new Date(2026, 0, 15))).toBe(false);
  });
});

describe("isNationalDayActive（日期或参数二选一）", () => {
  it("国庆期间：无需参数即激活", () => {
    expect(isNationalDayActive("", new Date(2026, 9, 1))).toBe(true);
  });

  it("非国庆：?egg=cn_birthday 参数激活", () => {
    expect(isNationalDayActive("?egg=cn_birthday", new Date(2026, 0, 1))).toBe(true);
  });

  it("参数可与其它查询参数共存", () => {
    expect(isNationalDayActive("?a=1&egg=cn_birthday&b=2", new Date(2026, 0, 1))).toBe(true);
  });

  it("非国庆且无参数：不激活", () => {
    expect(isNationalDayActive("", new Date(2026, 0, 1))).toBe(false);
  });

  it("参数值不匹配（如 egg=xxx）：不激活", () => {
    expect(isNationalDayActive("?egg=xxx", new Date(2026, 0, 1))).toBe(false);
  });
});

describe("applyNationalDayClass（<html> class 增删）", () => {
  it("激活时添加 egg-cn-birthday，关闭时移除", () => {
    applyNationalDayClass(true);
    expect(document.documentElement.classList.contains(NATIONAL_DAY_CLASS)).toBe(true);

    applyNationalDayClass(false);
    expect(document.documentElement.classList.contains(NATIONAL_DAY_CLASS)).toBe(false);
  });

  it("重复调用幂等", () => {
    applyNationalDayClass(true);
    applyNationalDayClass(true);
    const count = Array.from(document.documentElement.classList).filter(
      (c) => c === NATIONAL_DAY_CLASS,
    ).length;
    expect(count).toBe(1);
  });
});

describe("isMidAutumnParamActive（参数 egg=cn_mid_autumn）", () => {
  it("参数命中返回 true", () => {
    expect(isMidAutumnParamActive("?egg=cn_mid_autumn")).toBe(true);
  });

  it("与其它查询参数共存", () => {
    expect(isMidAutumnParamActive("?a=1&egg=cn_mid_autumn&b=2")).toBe(true);
  });

  it("无参数或参数值不匹配：返回 false", () => {
    expect(isMidAutumnParamActive("")).toBe(false);
    expect(isMidAutumnParamActive("?egg=xxx")).toBe(false);
  });
});

describe("isMidAutumnLunarDate（农历八月十五判断）", () => {
  it("八月十五返回 true", () => {
    expect(isMidAutumnLunarDate("八月十五")).toBe(true);
  });

  it("非八月十五返回 false（含闰月）", () => {
    expect(isMidAutumnLunarDate("八月初一")).toBe(false);
    expect(isMidAutumnLunarDate("八月十四")).toBe(false);
    expect(isMidAutumnLunarDate("闰八月十五")).toBe(false);
  });
});

describe("formatApiDate（HKO 要求 YYYY-MM-DD）", () => {
  it("月份与日期补零", () => {
    expect(formatApiDate(new Date(2026, 8, 25))).toBe("2026-09-25");
    expect(formatApiDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("fetchLunarDate（香港天文台农历 API）", () => {
  it("成功解析 HKO 农历数据，URL 携带当天日期", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ LunarYear: "丙午年，馬", LunarDate: "八月十五" }),
    });
    const data = await fetchLunarDate(new Date(2026, 8, 25), fetcher);
    expect(data).toEqual({ LunarYear: "丙午年，馬", LunarDate: "八月十五" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php?date=2026-09-25",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("HTTP 非 2xx 返回 null", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await fetchLunarDate(new Date(), fetcher)).toBeNull();
  });

  it("响应缺少 LunarDate 字段返回 null", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ foo: "bar" }),
    });
    expect(await fetchLunarDate(new Date(), fetcher)).toBeNull();
  });

  it("网络异常返回 null（静默降级，不抛错）", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    expect(await fetchLunarDate(new Date(), fetcher)).toBeNull();
  });
});

describe("isMidAutumnActive（参数短路或 API 日期命中）", () => {
  it("参数命中短路，不请求 API", async () => {
    const fetcher = vi.fn();
    const active = await isMidAutumnActive("?egg=cn_mid_autumn", new Date(), fetcher);
    expect(active).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("API 返回八月十五：日期命中", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ LunarYear: "丙午年，馬", LunarDate: "八月十五" }),
    });
    expect(await isMidAutumnActive("", new Date(2026, 8, 25), fetcher)).toBe(true);
  });

  it("API 返回非八月十五：不激活", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ LunarYear: "丙午年，馬", LunarDate: "八月初一" }),
    });
    expect(await isMidAutumnActive("", new Date(2026, 8, 11), fetcher)).toBe(false);
  });

  it("API 不可用：不激活（静默降级）", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    expect(await isMidAutumnActive("", new Date(), fetcher)).toBe(false);
  });
});

describe("applyMidAutumnClass（<html> class 增删）", () => {
  it("激活时添加 egg-mid-autumn，关闭时移除", () => {
    applyMidAutumnClass(true);
    expect(document.documentElement.classList.contains(MID_AUTUMN_CLASS)).toBe(true);

    applyMidAutumnClass(false);
    expect(document.documentElement.classList.contains(MID_AUTUMN_CLASS)).toBe(false);
  });
});
