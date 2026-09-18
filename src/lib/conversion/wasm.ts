/**
 * WASM 转换引擎的共享加载错误。
 *
 * ffmpeg.wasm / pandoc-wasm 的二进制从 CDN 按需下载（不打包进站点，
 * 避免 GitHub Pages / Cloudflare Pages 资源体积超限）。加载失败时抛出
 * 该错误，页面据此展示「WASM 不可用」提示，而不是让用户看到原始网络异常。
 */
export class WasmUnavailableError extends Error {
  constructor(
    message = "WASM 转换引擎不可用：无法从 CDN 加载，请检查网络连接后重试",
  ) {
    super(message);
    this.name = "WasmUnavailableError";
  }
}
