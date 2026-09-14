/**
 * 友好错误提示映射测试。
 */
import { describe, expect, it } from "vitest";
import { friendlyError } from "@/lib/crypto/errors";

describe("friendlyError 错误提示映射", () => {
  it("模块主动抛出的中文提示直接透出", () => {
    expect(friendlyError(new Error("请输入密码"), "回退")).toBe("请输入密码");
    expect(friendlyError(new Error("密文格式不正确，请粘贴本工具生成的密文"), "回退")).toBe(
      "密文格式不正确，请粘贴本工具生成的密文",
    );
  });

  it("空密钥底层错误映射为友好提示", () => {
    expect(
      friendlyError(new Error("Zero-length key is not supported"), "回退"),
    ).toBe("请先填写必要的密钥或密码");
  });

  it("未知底层错误回退到操作级提示", () => {
    const fallback = "解密失败：密码错误、密文被篡改或格式不正确";
    expect(
      friendlyError(new Error("The operation failed for an operation-specific reason"), fallback),
    ).toBe(fallback);
  });

  it("非 Error 值回退", () => {
    expect(friendlyError("boom", "回退")).toBe("回退");
    expect(friendlyError(undefined, "回退")).toBe("回退");
  });
});
