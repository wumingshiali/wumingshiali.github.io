import { createSSRApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { routes } from "vue-router/auto-routes";
import { createHead } from "@unhead/vue/client";
import App from "./App.vue";
import { applyMidAutumnClass, applyNationalDayClass, isMidAutumnParamActive } from "@/lib/festival";

import "./assets/index.css";

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const head = createHead();

// 国庆彩蛋：日期或 ?egg=cn_birthday 命中时给 <html> 打上 egg-cn-birthday class。
// 挂在 mount 之前，保证渲染/水合时主题样式已就位（首屏防闪烁由 index.html 内联脚本兜底）。
applyNationalDayClass();

// 中秋彩蛋：参数命中同步生效（日期命中需异步调香港天文台农历 API，由 App.vue 处理）
if (isMidAutumnParamActive()) applyMidAutumnClass(true);

// createSSRApp + mount 在客户端容器有内容时自动 hydrate：复用 SSG 静态 DOM，
// 避免 createApp().mount() 清空重渲染导致 LCP 图片重新解码（LCP 大幅推迟）。
createSSRApp(App).use(router).use(head).mount("#app");
