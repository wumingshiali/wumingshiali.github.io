/// <reference types="vite/client" />

// 构建时由 vite.config.ts 的 define 注入（git rev-parse --short HEAD）
declare const __GIT_COMMIT_ID__: string;

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
