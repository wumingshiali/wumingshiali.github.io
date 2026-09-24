import type { Component } from "vue";
import {
  Activity,
  FileBadge,
  FileCode,
  Fingerprint,
  Gauge,
  Globe,
  Image,
  KeyRound,
  LockKeyhole,
  MapPin,
  Network,
  Repeat,
  ShieldCheck,
  Video,
} from "@lucide/vue";

/**
 * 工具页统一元数据：工具总览页、分组页卡片与桌面导航悬停子菜单共用，
 * 保证各处入口的名称 / 链接 / 图标始终一致。
 */
export interface ToolInfo {
  /** 工具路由，如 "/tools/encryption/hash" */
  to: string;
  /** 工具名称 */
  label: string;
  /** 一句话描述 */
  description: string;
  /** 图标 */
  icon: Component;
}

/** 工具分组（加密 / 转换）：对应一个「文件夹」路由 */
export interface ToolGroup {
  /** 分组路由，如 "/tools/encryption" */
  to: string;
  /** 分组名称 */
  label: string;
  /** 一句话描述 */
  description: string;
  /** 分组图标 */
  icon: Component;
  /** 分组内工具 */
  items: ToolInfo[];
}

const encryptionTools: ToolInfo[] = [
  {
    to: "/tools/encryption/hash",
    label: "单向加密",
    description: "散列 / 加盐派生：MD5、SHA、HMAC、PBKDF2、scrypt",
    icon: Fingerprint,
  },
  {
    to: "/tools/encryption/symmetric",
    label: "对称加密",
    description: "同一密码加解密：AES-GCM / AES-CBC，支持 Argon2 派生",
    icon: KeyRound,
  },
  {
    to: "/tools/encryption/asymmetric",
    label: "非对称加密",
    description: "公钥加密、私钥解密：RSA / ECC / 后量子 ML-KEM",
    icon: LockKeyhole,
  },
];

const conversionTools: ToolInfo[] = [
  {
    to: "/tools/conversion/image",
    label: "图片转换",
    description: "PNG / JPEG / WebP / AVIF 互转，浏览器原生处理",
    icon: Image,
  },
  {
    to: "/tools/conversion/video",
    label: "视频转换",
    description: "MP4 / WebM / GIF / 音频提取，ffmpeg.wasm 本地转码",
    icon: Video,
  },
  {
    to: "/tools/conversion/document",
    label: "文档转换",
    description: "Markdown 与 DOCX 双向转换，pandoc-wasm 驱动",
    icon: FileCode,
  },
];

const networkTools: ToolInfo[] = [
  {
    to: "/tools/network/cidr",
    label: "CIDR 展开",
    description: "批量展开 CIDR 为全部 IP，Rust wasm 加速 + JS 回退",
    icon: Network,
  },
  {
    to: "/tools/network/ip",
    label: "IP 归属",
    description: "查询 IP 归属地（省市 / ISP），支持批量",
    icon: MapPin,
  },
  {
    to: "/tools/network/ping",
    label: "本地 Ping",
    description: "HTTP 时延测量与丢包统计，支持批量",
    icon: Activity,
  },
  {
    to: "/tools/network/speedtest",
    label: "本地测速",
    description: "下载 / 上传速度测试，实时进度",
    icon: Gauge,
  },
  {
    to: "/tools/network/cert",
    label: "证书信息",
    description: "解析证书 PEM 或查询 CT 日志",
    icon: FileBadge,
  },
];
export const toolGroups: ToolGroup[] = [
  {
    to: "/tools/encryption",
    label: "加密",
    description: "哈希、对称与非对称加密工具，全程浏览器本地计算",
    icon: ShieldCheck,
    items: encryptionTools,
  },
  {
    to: "/tools/conversion",
    label: "转换",
    description: "图片 / 视频 / 文档格式转换，WASM 引擎按需加载",
    icon: Repeat,
    items: conversionTools,
  },
  {
    to: "/tools/network",
    label: "网络",
    description: "CIDR 展开、IP 归属、Ping、测速与证书信息，支持批处理",
    icon: Globe,
    items: networkTools,
  },
];

/** 全部工具（扁平）：桌面导航悬停子菜单与测试遍历使用 */
export const toolItems: ToolInfo[] = toolGroups.flatMap((group) => group.items);
