import { createApp } from "vue";
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

createApp(App).use(router).use(head).mount("#app");
