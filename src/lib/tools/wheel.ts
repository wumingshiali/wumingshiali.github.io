/**
 * 随机转盘核心逻辑（纯函数，无 DOM 依赖，便于单元测试）。
 *
 * 玩法约定：点击「转」会 roll 出一个 720–2160 的力度（单位：度），
 * 轮盘顺时针旋转与力度相等的度数——每转一度消耗一个力。
 */

/** 转盘选项：名称 + 占比（百分比，默认平分） */
export interface WheelItem {
  id: number;
  name: string;
  /** 占比（百分比，可为小数）；相对大小即权重，总和不必恰好 100 */
  ratio: number;
}

/** 力度（即旋转度数）范围：720–2160 */
export const FORCE_MIN = 720;
export const FORCE_MAX = 2160;

/** 轮盘扇区色板（饱和色，白字均清晰可读） */
export const WHEEL_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
  "#f43f5e",
  "#84cc16",
  "#0ea5e9",
  "#d946ef",
  "#f59e0b",
] as const;

let seq = 0;

/** 新建选项；ratio 由调用方按「默认平分」策略赋值 */
export function createWheelItem(name = "", ratio = 0): WheelItem {
  seq += 1;
  return { id: seq, name, ratio };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 全部选项的权重总和（负值按 0 处理） */
export function totalWeight(items: WheelItem[]): number {
  return items.reduce((sum, it) => sum + Math.max(0, it.ratio), 0);
}

/** 把舍入误差补到首个正权选项上，保证总和正好等于 100 */
function fixRounding(items: WheelItem[]): WheelItem[] {
  const diff = round2(100 - totalWeight(items));
  if (Math.abs(diff) < 0.001 || items.length === 0) return items;
  const idx = items.findIndex((it) => it.ratio > 0);
  if (idx < 0) return items;
  const next = items.map((it) => ({ ...it }));
  next[idx] = { ...next[idx], ratio: round2(next[idx].ratio + diff) };
  return next;
}

/** 默认平分：把 100% 平均分给每个选项（未手动编辑占比时使用） */
export function equalize(items: WheelItem[]): WheelItem[] {
  if (items.length === 0) return items;
  const equal = round2(100 / items.length);
  return fixRounding(items.map((it) => ({ ...it, ratio: equal })));
}

/**
 * 增加选项：新选项默认拿 1/(n+1) 的份额，已有选项按比例压缩，
 * 占比总和始终保持在 100（手动编辑过占比、总和偏离 100 时同样成立）。
 */
export function addItemBalanced(items: WheelItem[]): WheelItem[] {
  const share = round2(100 / (items.length + 1));
  const oldTotal = totalWeight(items);
  const scale = oldTotal > 0 ? (100 - share) / oldTotal : 0;
  const next = items.map((it) => ({
    ...it,
    ratio: round2(Math.max(0, it.ratio) * scale),
  }));
  next.push(createWheelItem("", share));
  return fixRounding(next);
}

/** 按占比加权随机抽取一个选项；列表为空或总权重为 0 时返回 null */
export function weightedPick(
  items: WheelItem[],
  random: () => number = Math.random,
): WheelItem | null {
  const total = totalWeight(items);
  if (items.length === 0 || total <= 0) return null;
  let r = random() * total;
  for (const it of items) {
    r -= Math.max(0, it.ratio);
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

/** roll 力度：720–2160 闭区间的整数度数 */
export function rollForce(random: () => number = Math.random): number {
  return FORCE_MIN + Math.floor(random() * (FORCE_MAX - FORCE_MIN + 1));
}

/**
 * 轮盘顺时针旋转 totalDeg 后，指针（12 点方向）命中的选项下标。
 * 扇区按比例从 12 点起顺时针排列；无有效选项时返回 -1。
 */
export function winnerIndex(totalDeg: number, items: WheelItem[]): number {
  const total = totalWeight(items);
  if (total <= 0) return -1;
  const angle = ((360 - (totalDeg % 360)) % 360 + 360) % 360;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const start = (acc / total) * 360;
    acc += Math.max(0, items[i].ratio);
    const end = (acc / total) * 360;
    if (angle >= start && angle < end) return i;
  }
  return items.length - 1;
}

/** 极坐标 → 直角坐标；angleDeg 以 12 点方向为 0°，顺时针 */
export function polarPoint(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** 生成单个扇区的 SVG path（从 12 点方向顺时针）；整圆时输出完整圆形 */
export function slicePath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  if (endDeg - startDeg >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const p1 = polarPoint(cx, cy, r, startDeg);
  const p2 = polarPoint(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
}

/** 扇区文本标签布局 */
export interface WheelLabel {
  x: number;
  y: number;
  /** 文字旋转角（度），保证扇区在任意方向都正向可读 */
  rotate: number;
}

/** 计算扇区中点标签位置（半径 62%，避开中心按钮与边缘） */
export function sliceLabel(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): WheelLabel {
  const mid = (startDeg + endDeg) / 2;
  const pos = polarPoint(cx, cy, r * 0.62, mid);
  // 下半部分翻转 180°，避免标签倒置
  const rotate = mid > 90 && mid < 270 ? mid - 180 : mid;
  return { x: pos.x, y: pos.y, rotate };
}

/** 渲染用扇区（路径 + 标签 + 配色） */
export interface WheelSlice {
  id: number;
  path: string;
  label: WheelLabel;
  color: string;
  name: string;
}

/** 把选项列表转换为轮盘扇区（从 12 点方向顺时针，扇区角度与占比成正比） */
export function buildSlices(
  items: WheelItem[],
  cx: number,
  cy: number,
  r: number,
): WheelSlice[] {
  const total = totalWeight(items);
  if (total <= 0) return [];
  const slices: WheelSlice[] = [];
  let acc = 0;
  for (const it of items) {
    const start = (acc / total) * 360;
    acc += Math.max(0, it.ratio);
    const end = (acc / total) * 360;
    slices.push({
      id: it.id,
      path: slicePath(cx, cy, r, start, end),
      label: sliceLabel(cx, cy, r, start, end),
      color: WHEEL_COLORS[slices.length % WHEEL_COLORS.length],
      name: it.name,
    });
  }
  return slices;
}


