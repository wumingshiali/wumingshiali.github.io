import type { Component } from "vue";
import { FileText, Home, Info, Link2, Mail, Wrench } from "@lucide/vue";
import { toolGroups, type ToolGroup } from "@/lib/tools";

/** 主导航项：桌面端底部胶囊导航与移动端悬浮菜单共用，保证两处入口始终一致。 */
export interface NavItem {
  to: string;
  label: string;
  icon: Component;
  /** 桌面端悬停子菜单的分组（目前仅「工具」），按分组分级展示 */
  groups?: ToolGroup[];
}

export const navItems: NavItem[] = [
  { to: "/", label: "主页", icon: Home },
  { to: "/contact", label: "联系", icon: Mail },
  { to: "/posts", label: "博客", icon: FileText },
  { to: "/links", label: "友链", icon: Link2 },
  { to: "/tools", label: "工具", icon: Wrench, groups: toolGroups },
  { to: "/about", label: "关于", icon: Info },
];
