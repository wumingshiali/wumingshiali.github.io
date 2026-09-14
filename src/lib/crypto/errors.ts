/**
 * 用户友好的错误提示工具。
 *
 * 页面层不再直接展示底层异常（WebCrypto 等原始英文报错），
 * 统一经 friendlyError 映射：模块层主动抛出的中文提示直接透出，
 * 其余底层错误按操作场景回退到通用中文说明。
 */

/**
 * 把异常映射为对用户友好的提示文案。
 * @param err 捕获到的异常
 * @param fallback 无法识别时的操作级中文提示（如"解密失败：…"）
 */
export function friendlyError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  if (!msg) return fallback;
  // 模块层主动抛出的中文提示（含"请输入密码"等）直接透出
  if (/[\u4e00-\u9fff]/.test(msg)) return msg;
  // 常见底层错误 → 操作级通用提示
  if (/zero-length|empty key|key is not supported/i.test(msg)) {
    return "请先填写必要的密钥或密码";
  }
  return fallback;
}
