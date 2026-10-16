/**
 * 随机转盘核心逻辑单元测试。
 *
 * 覆盖：默认平分 / 增加选项的占比再平衡、加权随机抽取、力度 roll 范围、
 * 旋转后指针命中的扇区判定，以及轮盘扇区（path / 标签）的生成。
 */
import { describe, expect, it } from "vitest";
import {
  addItemBalanced,
  buildSlices,
  createWheelItem,
  equalize,
  rollForce,
  slicePath,
  totalWeight,
  weightedPick,
  winnerIndex,
  FORCE_MAX,
  FORCE_MIN,
} from "@/lib/tools/wheel";

describe("占比与列表", () => {
  it("equalize：默认平分且总和恰好 100", () => {
    const three = equalize([
      createWheelItem("A"),
      createWheelItem("B"),
      createWheelItem("C"),
    ]);
    expect(three.map((it) => it.ratio)).toEqual([33.34, 33.33, 33.33]);
    expect(totalWeight(three)).toBe(100);

    expect(equalize([])).toEqual([]);
    expect(equalize([createWheelItem("单")]).map((it) => it.ratio)).toEqual([100]);
  });

  it("addItemBalanced：未编辑时继续默认平分，总和保持 100", () => {
    const two = equalize([
      createWheelItem("A"),
      createWheelItem("B"),
    ]);
    const three = addItemBalanced(two);
    expect(three).toHaveLength(3);
    expect(three.map((it) => it.ratio)).toEqual([33.33, 33.34, 33.33]);
    expect(totalWeight(three)).toBe(100);
  });

  it("addItemBalanced：手动编辑过占比时等比压缩并保持总和 100", () => {
    const items = [createWheelItem("A", 80), createWheelItem("B", 20)];
    const next = addItemBalanced(items);
    expect(next.map((it) => it.ratio)).toEqual([53.34, 13.33, 33.33]);
    expect(totalWeight(next)).toBe(100);
  });

  it("addItemBalanced：占比总和偏离 100 时仍等比压缩并回到 100", () => {
    const items = [
      createWheelItem("A", 80),
      createWheelItem("B", 33.33),
      createWheelItem("C", 33.33),
    ];
    const next = addItemBalanced(items);
    expect(next.map((it) => it.ratio)).toEqual([40.92, 17.04, 17.04, 25]);
    expect(totalWeight(next)).toBe(100);
  });
});

describe("加权随机抽取", () => {
  it("按占比加权：random 落在哪个区间就抽中对应项", () => {
    const items = [createWheelItem("A", 10), createWheelItem("B", 90)];
    expect(weightedPick(items, () => 0)?.name).toBe("A");
    expect(weightedPick(items, () => 0.09)?.name).toBe("A");
    expect(weightedPick(items, () => 0.5)?.name).toBe("B");
    expect(weightedPick(items, () => 0.99)?.name).toBe("B");
  });

  it("空列表或总权重为 0 时返回 null", () => {
    expect(weightedPick([], () => 0)).toBeNull();
    expect(weightedPick([createWheelItem("A", 0)], () => 0)).toBeNull();
  });
});

describe("力度 roll（每转一度消耗一个力）", () => {
  it("范围在 720–2160 的整数闭区间", () => {
    expect(rollForce(() => 0)).toBe(720);
    expect(rollForce(() => 0.5)).toBe(1440);
    expect(rollForce(() => 0.999999)).toBe(2160);
    // 真实随机若干次也落在范围内
    for (let i = 0; i < 100; i++) {
      const f = rollForce();
      expect(f).toBeGreaterThanOrEqual(FORCE_MIN);
      expect(f).toBeLessThanOrEqual(FORCE_MAX);
      expect(Number.isInteger(f)).toBe(true);
    }
  });
});

describe("旋转命中判定", () => {
  it("等分两扇区：按顺时针旋转后 12 点方向命中的扇区", () => {
    const items = [createWheelItem("A", 50), createWheelItem("B", 50)];
    expect(winnerIndex(0, items)).toBe(0); // 没转 → A
    expect(winnerIndex(90, items)).toBe(1); // 转 90° → 原本在 270° 的 B
    expect(winnerIndex(180, items)).toBe(1);
    expect(winnerIndex(360, items)).toBe(0); // 整圈回来
    expect(winnerIndex(720, items)).toBe(0); // 两整圈
  });

  it("非等分扇区：按占比边界判定", () => {
    const items = [createWheelItem("A", 25), createWheelItem("B", 50), createWheelItem("C", 25)];
    // 扇区：A=[0,90) B=[90,270) C=[270,360)
    expect(winnerIndex(0, items)).toBe(0);
    expect(winnerIndex(45, items)).toBe(2); // 转到 315°
    expect(winnerIndex(135, items)).toBe(1); // 转到 225°
    expect(winnerIndex(270, items)).toBe(1); // 转到 90°（B 起点）
  });

  it("无有效选项时返回 -1", () => {
    expect(winnerIndex(90, [createWheelItem("A", 0)])).toBe(-1);
    expect(winnerIndex(90, [])).toBe(-1);
  });
});

describe("轮盘扇区生成", () => {
  it("buildSlices：扇区数量与占比顺序一致", () => {
    const items = [createWheelItem("A", 50), createWheelItem("B", 50)];
    const slices = buildSlices(items, 130, 130, 126);
    expect(slices).toHaveLength(2);
    expect(slices.map((s) => s.name)).toEqual(["A", "B"]);
    expect(slices[0].path.startsWith("M 130 130 L")).toBe(true);
    expect(slices[1].path.startsWith("M 130 130 L")).toBe(true);
  });

  it("slicePath：单扇区（整圆）输出圆形路径", () => {
    const p = slicePath(130, 130, 126, 0, 360);
    expect(p).toContain("A 126 126 0 1 1");
    expect(p.endsWith("Z")).toBe(true);
  });

  it("buildSlices：占比为 0 的选项生成零宽扇区（不吞并其他扇区）", () => {
    const items = [createWheelItem("A", 100), createWheelItem("B", 0)];
    const slices = buildSlices(items, 130, 130, 126);
    expect(slices).toHaveLength(2);
    // A 占满整圆
    expect(slices[0].path).toContain("A 126 126 0 1 1");
    // B 起止点重合（零宽：L 与 A 的终点都是 12 点方向同一点）
    expect(slices[1].path).toContain("L 130.00 4.00 A 126 126 0 0 1 130.00 4.00");
  });
});


