/**
 * 国庆彩蛋检测逻辑单元测试。
 *
 * 关注：日期边界（10.1-10.7）、URL 参数 egg=cn_birthday 触发、class 增删幂等。
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  applyNationalDayClass,
  isNationalDay,
  isNationalDayActive,
  NATIONAL_DAY_CLASS,
} from "@/lib/festival";

afterEach(() => {
  document.documentElement.classList.remove(NATIONAL_DAY_CLASS);
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
