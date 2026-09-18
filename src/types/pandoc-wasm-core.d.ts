/**
 * pandoc-wasm 深层导入的类型声明。
 *
 * vite.config.ts 通过 alias 把 `pandoc-wasm/core` 指向
 * node_modules/pandoc-wasm/src/core.js（绕过 exports 限制，避免打包 58MB wasm），
 * 这里为 vue-tsc / 编辑器提供与真实实现一致的最小类型。
 */
declare module "pandoc-wasm/core" {
  export interface PandocConvertResult {
    stdout: string;
    stderr: string;
    warnings: unknown[];
    files: Record<string, string | Blob>;
    mediaFiles: Record<string, Blob>;
  }

  export interface PandocInstance {
    convert(
      options: Record<string, unknown>,
      stdin: string | null,
      files: Record<string, string | Blob>,
    ): Promise<PandocConvertResult>;
  }

  export function createPandocInstance(
    wasmBinary: ArrayBuffer | Uint8Array,
  ): Promise<PandocInstance>;
}
