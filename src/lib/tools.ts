import type { Component } from "vue";
import { Fingerprint, KeyRound, LockKeyhole } from "@lucide/vue";

/**
 * 工具页统一元数据：工具总览页卡片与桌面导航悬停子菜单共用，
 * 保证两处入口的名称 / 链接 / 图标始终一致。
 */
export interface ToolInfo {
  /** 工具路由，如 "/tools/hash" */
  to: string;
  /** 工具名称 */
  label: string;
  /** 一句话描述 */
  description: string;
  /** 图标 */
  icon: Component;
}

export const toolItems: ToolInfo[] = [
  {
    to: "/tools/hash",
    label: "单向加密",
    description: "散列 / 加盐派生：MD5、SHA、HMAC、PBKDF2、scrypt",
    icon: Fingerprint,
  },
  {
    to: "/tools/symmetric",
    label: "对称加密",
    description: "同一密码加解密：AES-GCM / AES-CBC",
    icon: KeyRound,
  },
  {
    to: "/tools/asymmetric",
    label: "非对称加密",
    description: "公钥加密、私钥解密：RSA / ECC / 后量子 ML-KEM",
    icon: LockKeyhole,
  },
];
