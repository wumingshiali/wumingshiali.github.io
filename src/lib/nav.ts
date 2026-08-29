import type { Component } from "vue";
import { FileText, Home, Info, Mail } from "@lucide/vue";

/** 主导航项：桌面端底部胶囊导航与移动端悬浮菜单共用，保证两处入口始终一致。 */
export interface NavItem {
  to: string;
  label: string;
  icon: Component;
}

export const navItems: NavItem[] = [
  { to: "/", label: "主页", icon: Home },
  { to: "/contact", label: "联系", icon: Mail },
  { to: "/posts", label: "博客", icon: FileText },
  { to: "/about", label: "关于", icon: Info },
];
