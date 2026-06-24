/**
 * `cn` 工具函数单元测试。
 *
 * 关注：clsx 合并 + tailwind-merge 解决类名冲突。
 */
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("拼接多个类名", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("过滤 falsy 值", () => {
    expect(cn("a", false, null, undefined, "", 0, "b")).toBe("a b");
  });

  it("tailwind 冲突时后者覆盖前者", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("接受数组入参", () => {
    expect(cn(["a", "b"])).toBe("a b");
  });

  it("接受对象入参（条件类）", () => {
    expect(cn({ c: true, d: false })).toBe("c");
  });

  it("混合入参", () => {
    expect(cn("a", ["b", { c: true, d: false }], "e")).toBe("a b c e");
  });
});
