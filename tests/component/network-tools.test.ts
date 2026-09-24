/**
 * 网络工具组件测试。
 *
 * 关注：
 * - 网络分组首页渲染
 * - 各网络工具页渲染（CIDR / IP 归属 / Ping / 测速 / 证书）
 * - CIDR 展开在 wasm 不可用（测试环境 fetch 被 stub 拒绝）时自动回退 JS
 * - 证书页在 reflect-metadata polyfill 下可正常渲染（tsyringe 依赖）
 */
import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import NetworkIndexPage from "@/pages/tools/network/index.vue";
import CidrPage from "@/pages/tools/network/cidr.vue";
import IpPage from "@/pages/tools/network/ip.vue";
import PingPage from "@/pages/tools/network/ping.vue";
import SpeedtestPage from "@/pages/tools/network/speedtest.vue";
import CertPage from "@/pages/tools/network/cert.vue";
import { parseCidr, parseCidrList } from "@/lib/network/cidr";
import { normalizeUrl } from "@/lib/network/ping";
import { isValidIp } from "@/lib/network/ip";

async function mountAt(component: unknown, initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(component as never, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 50));
  for (let i = 0; i < 4; i++) {
    await nextTick();
    await flushPromises();
  }
}

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll("button").find((b) => b.text().includes(label))!;
}

describe("/tools/network 网络分组", () => {
  it("分组首页渲染五张网络工具卡片", async () => {
    const wrapper = await mountAt(NetworkIndexPage, "/tools/network");
    for (const href of [
      "/tools/network/cidr",
      "/tools/network/ip",
      "/tools/network/ping",
      "/tools/network/speedtest",
      "/tools/network/cert",
    ]) {
      expect(wrapper.find(`a[href="${href}"]`).exists()).toBe(true);
    }
  });
});

describe("/tools/network/cidr CIDR 展开", () => {
  it("输入多行 CIDR 展开（wasm 不可用时回退 JS）", async () => {
    const wrapper = await mountAt(CidrPage, "/tools/network/cidr");
    await wrapper.find("textarea").setValue("192.168.1.0/30\n10.0.0.128/29");
    await findButton(wrapper, "展开").trigger("click");
    await settle();

    const output = wrapper.find('textarea[aria-label="CIDR 展开结果"]');
    const value = (output.element as HTMLTextAreaElement).value;
    expect(value).toContain("192.168.1.0");
    expect(value).toContain("192.168.1.3");
    expect(value).toContain("10.0.0.128");
    expect(value).toContain("10.0.0.135");
  });

  it("非法 CIDR 给出行级警告且不中断合法行", async () => {
    const wrapper = await mountAt(CidrPage, "/tools/network/cidr");
    await wrapper.find("textarea").setValue("999.1.1.0/24\n10.0.0.0/30");
    await findButton(wrapper, "展开").trigger("click");
    await settle();
    const output = (wrapper.find('textarea[aria-label="CIDR 展开结果"]').element as HTMLTextAreaElement).value;
    expect(output).toContain("10.0.0.0");
    expect(wrapper.text()).toContain("不是合法的 CIDR");
  });
});

describe("网络工具纯逻辑", () => {
  it("parseCidr：解析网络起始地址与主机数", () => {
    const e = parseCidr("192.168.1.5/30")!;
    expect(e.start).toBe(0xc0a80104); // 192.168.1.4（网络号）
    expect(e.count).toBe(4);
    expect(parseCidr("abc")).toBeNull();
    expect(parseCidr("1.2.3.4/33")).toBeNull();
    expect(parseCidr("256.1.1.1/24")).toBeNull();
  });

  it("parseCidrList：统计与行级错误", () => {
    const r = parseCidrList("10.0.0.0/30\nbad\n10.1.0.0/31");
    expect(r.entries).toHaveLength(2);
    expect(r.total).toBe(6);
    expect(r.errors).toHaveLength(1);
  });

  it("normalizeUrl：补全协议", () => {
    expect(normalizeUrl("baidu.com")).toBe("https://baidu.com");
    expect(normalizeUrl("http://a.b")).toBe("http://a.b");
    expect(normalizeUrl("")).toBe("");
  });

  it("isValidIp：IPv4 校验", () => {
    expect(isValidIp("8.8.8.8")).toBe(true);
    expect(isValidIp("999.1.1.1")).toBe(false);
    expect(isValidIp("1.2.3")).toBe(false);
  });
});

describe("网络工具页面渲染", () => {
  it("IP 归属页渲染", async () => {
    const wrapper = await mountAt(IpPage, "/tools/network/ip");
    expect(wrapper.text()).toContain("IP 归属");
    expect(wrapper.find("textarea").exists()).toBe(true);
  });

  it("Ping 页渲染", async () => {
    const wrapper = await mountAt(PingPage, "/tools/network/ping");
    expect(wrapper.text()).toContain("本地 Ping");
    expect(wrapper.find("textarea").exists()).toBe(true);
  });

  it("测速页渲染", async () => {
    const wrapper = await mountAt(SpeedtestPage, "/tools/network/speedtest");
    expect(wrapper.text()).toContain("本地测速");
    expect(wrapper.find('input[type="url"]').exists()).toBe(true);
  });

  it("证书页渲染（reflect-metadata polyfill 生效，不抛 tsyringe 错误）", async () => {
    const wrapper = await mountAt(CertPage, "/tools/network/cert");
    expect(wrapper.text()).toContain("证书信息");
    expect(wrapper.text()).toContain("解析 PEM");
  });
});
