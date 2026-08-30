import { createSSRApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { routes } from "vue-router/auto-routes";
import { createHead } from "@unhead/vue/client";
import App from "./App.vue";

import "./assets/index.css";

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const head = createHead();

// createSSRApp + mount 在客户端容器有内容时自动 hydrate：复用 SSG 静态 DOM，
// 避免 createApp().mount() 清空重渲染导致 LCP 图片重新解码（LCP 大幅推迟）。
createSSRApp(App).use(router).use(head).mount("#app");
