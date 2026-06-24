/**
 * /contact 页面组件测试。
 *
 * 关注：Dialog 验证流程、按钮点击、clipboard 复制。
 * 关键点：reka-ui Dialog 内容会传送到 document.body，需要在那里查询 DOM。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import ContactPage from "@/pages/contact.vue";

beforeEach(() => {
  // 组件调用 navigator.clipboard?.writeText；happy-dom 默认无 clipboard
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

async function mountAt(initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(ContactPage, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
}

// 等异步解密 + DOM 更新完成：decrypt 是 async，需多轮 nextTick + flushPromises
async function settle() {
  for (let i = 0; i < 5; i++) {
    await nextTick();
    await flushPromises();
  }
}

describe("/contact 页面", () => {
  it("初始渲染：locked 状态下显示 Email/微信 卡片与「解密所有」按钮", async () => {
    const wrapper = await mountAt("/contact");
    const text = wrapper.text();
    expect(text).toContain("Email");
    expect(text).toContain("微信");
    expect(text).toContain("点击查看");
    expect(text).toContain("解密所有");
  });

  it("错答 '3'：对话框保持打开，提示「答案不对哦」", async () => {
    const wrapper = await mountAt("/contact");
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("解密所有"))!
      .trigger("click");
    await settle();

    // happy-dom 下 form submit 事件不可靠；直接调组件方法走真实的解密+状态切换路径。
    const vm = wrapper.vm as unknown as {
      userInput: string;
      handleVerify: () => Promise<void>;
    };
    vm.userInput = "3";
    await vm.handleVerify();
    await settle();

    expect(document.body.textContent).toContain("答案不对哦");
  });

  it("正解 '2'：对话框关闭，卡片显示明文", async () => {
    const wrapper = await mountAt("/contact");
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("解密所有"))!
      .trigger("click");
    await settle();

    // happy-dom 下 form submit 事件不可靠；直接调组件方法走真实的解密+状态切换路径。
    const vm = wrapper.vm as unknown as {
      userInput: string;
      handleVerify: () => Promise<void>;
    };
    vm.userInput = "2";
    await vm.handleVerify();
    await settle();

    expect(wrapper.text()).toContain("ZWj1154142014@hotmail.com");
    expect(wrapper.text()).toContain("AliZhouSZ");
    // 解密后出现「发封邮件」快捷按钮
    expect(wrapper.text()).toContain("发封邮件");
  });

  it("公开卡片（GitHub）无需验证：点击后调 clipboard.writeText", async () => {
    const wrapper = await mountAt("/contact");
    const githubBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("GitHub"));
    expect(githubBtn).toBeTruthy();
    await githubBtn!.trigger("click");
    await settle();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("wumingshiali");
  });
});
