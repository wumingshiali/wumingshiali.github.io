<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Input from "@/components/ui/input/Input.vue";
import {
  Dices,
  Disc3,
  Info,
  ListPlus,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash,
} from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import {
  addItemBalanced,
  buildSlices,
  createWheelItem,
  equalize,
  rollForce,
  round2,
  totalWeight,
  weightedPick,
  winnerIndex,
  type WheelItem,
} from "@/lib/tools/wheel";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "随机转盘",
  description:
    "自定义选项与占比的随机转盘：点「转」roll 出 720–2160 的力度并旋转，每转一度消耗一个力。",
  path: "/tools/other/wheel",
});

type Tab = "draw" | "wheel";
const tab = ref<Tab>("draw");

// ---------- 抽取列表 ----------
const items = ref<WheelItem[]>([]);
/** 用户是否手动编辑过占比：编辑后不再自动「默认平分」 */
const ratiosEdited = ref(false);

function resetDefaults() {
  items.value = equalize([
    createWheelItem("选项 A"),
    createWheelItem("选项 B"),
    createWheelItem("选项 C"),
  ]);
  ratiosEdited.value = false;
}
resetDefaults();

/** 参与抽取 / 转盘的选项：占比必须大于 0 */
const activeItems = computed(() =>
  items.value.filter((it) => it.ratio > 0),
);
const ratioSum = computed(() => round2(totalWeight(items.value)));

function setName(item: WheelItem, raw: string) {
  item.name = raw;
}

function setRatio(item: WheelItem, raw: string) {
  ratiosEdited.value = true;
  const n = Number(raw);
  item.ratio = raw === "" || !Number.isFinite(n) ? 0 : Math.max(0, n);
}

function addItem() {
  items.value = ratiosEdited.value
    ? addItemBalanced(items.value)
    : equalize([...items.value, createWheelItem()]);
}

function removeItem(id: number) {
  const next = items.value.filter((it) => it.id !== id);
  items.value = ratiosEdited.value ? next : equalize(next);
}

// ---------- 抽取（加权随机） ----------
const drawBusy = ref(false);
const drawFlicker = ref<WheelItem | null>(null);
const drawResult = ref<WheelItem | null>(null);
let drawTimer: ReturnType<typeof setInterval> | null = null;

function draw() {
  const act = activeItems.value;
  if (drawBusy.value || act.length === 0) return;
  drawResult.value = null;
  drawBusy.value = true;
  // 快速闪烁随机项制造抽选感，最后落定真实加权结果
  let count = 0;
  drawTimer = setInterval(() => {
    drawFlicker.value = weightedPick(act);
    count += 1;
    if (count >= 12) {
      clearInterval(drawTimer!);
      drawTimer = null;
      drawFlicker.value = null;
      drawResult.value = weightedPick(act);
      drawBusy.value = false;
    }
  }, 60);
}

// ---------- 大转盘 ----------
const spinDeg = ref(0);
const spinning = ref(false);
const spinDuration = ref(0.6);
const lastForce = ref<number | null>(null);
const lastWinner = ref<WheelItem | null>(null);
let spinTimer: ReturnType<typeof setTimeout> | null = null;

/** 轮盘整体旋转样式：顺时针，先快后慢的缓出动画 */
const wheelStyle = computed(() => ({
  transform: `rotate(${spinDeg.value}deg)`,
  transitionProperty: "transform",
  transitionTimingFunction: "cubic-bezier(0.12, 0.8, 0.2, 1)",
  transitionDuration: `${spinDuration.value}s`,
}));

const wheelSlices = computed(() => buildSlices(activeItems.value, 130, 130, 126));

function spin() {
  const act = activeItems.value;
  if (spinning.value || act.length === 0) return;
  const force = rollForce();
  lastForce.value = force;
  lastWinner.value = null;
  spinning.value = true;
  // 每转一度消耗一个力：总旋转度数 = 力度
  spinDeg.value += force;
  // 每 360° 约 0.5s，力度越大转得越久
  spinDuration.value = Math.max(0.8, (force / 360) * 0.5);
  spinTimer = setTimeout(() => {
    spinning.value = false;
    const actNow = activeItems.value;
    lastWinner.value = actNow[winnerIndex(spinDeg.value, actNow)] ?? null;
  }, spinDuration.value * 1000 + 80);
}

onBeforeUnmount(() => {
  if (drawTimer) clearInterval(drawTimer);
  if (spinTimer) clearTimeout(spinTimer);
});

/** 选项显示名兜底（空名显示「未命名」） */
function nameText(name: string): string {
  return name.trim() || "未命名";
}
</script>

<template>
  <ToolLayout
    title="随机转盘"
    description="自定义列表与占比，按权重随机抽取或转动大转盘喵～"
    back-to="/tools/other"
    back-label="返回其他工具"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 模式切换：抽取 / 大转盘 -->
      <div
        class="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/60 p-1"
        role="tablist"
        aria-label="随机转盘模式"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'draw'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="tab === 'draw' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="tab = 'draw'"
        >
          <Dices class="size-4" />
          抽取
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'wheel'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="tab === 'wheel' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          @click="tab = 'wheel'"
        >
          <Disc3 class="size-4" />
          大转盘
        </button>
      </div>

      <!-- 抽取列表：名称 / 占比（默认平分）/ 删除 / 末尾增加 -->
      <section
        class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <ListPlus class="size-4" />
            <h2 class="text-sm font-medium">抽取列表</h2>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">合计 {{ ratioSum }}%</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
              @click="resetDefaults"
            >
              <RefreshCcw class="size-3.5" />
              重置示例
            </Button>
          </div>
        </div>

        <div
          class="hidden grid-cols-[1fr_6.5rem_2.5rem] gap-2 px-1 text-xs text-muted-foreground sm:grid"
        >
          <span>名称</span>
          <span>占比（%）</span>
          <span />
        </div>

        <div class="flex flex-col gap-2">
          <div
            v-for="item in items"
            :key="item.id"
            class="grid grid-cols-[1fr_6.5rem_2.5rem] items-center gap-2"
          >
            <Input
              :model-value="item.name"
              :aria-label="`选项名称 ${item.id}`"
              placeholder="选项名称"
              @update:model-value="(v) => setName(item, v ?? '')"
            />
            <div class="relative">
              <Input
                type="number"
                min="0"
                step="any"
                :model-value="String(item.ratio)"
                :aria-label="`选项占比 ${item.id}`"
                class="pr-6 text-right"
                @update:model-value="(v) => setRatio(item, v ?? '')"
              />
              <span
                class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
              >
                %
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="text-muted-foreground hover:text-destructive"
              :aria-label="`删除 ${nameText(item.name)}`"
              @click="removeItem(item.id)"
            >
              <Trash class="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            class="w-full border-dashed border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
            @click="addItem"
          >
            <Plus class="size-4" />
            增加
          </Button>
        </div>
      </section>

      <!-- 抽取：加权随机 -->
      <section
        v-if="tab === 'draw'"
        class="flex flex-col items-center gap-4"
        aria-label="抽取"
      >
        <div
          class="flex w-full flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 dark:bg-input/30"
        >
          <p
            v-if="drawResult"
            class="text-center"
            role="status"
            aria-live="polite"
          >
            <span class="block text-4xl font-semibold sm:text-5xl">
              {{ nameText(drawResult?.name ?? "") }}
            </span>
            <span class="mt-1 block text-sm text-muted-foreground">本次抽中</span>
          </p>
          <p v-else-if="drawFlicker" class="text-4xl font-semibold text-muted-foreground">
            {{ nameText(drawFlicker?.name ?? "") }}
          </p>
          <p
            v-else
            class="text-sm text-muted-foreground"
          >
            点击下方按钮，按占比加权随机抽取一个选项喵～
          </p>
          <Button
            type="button"
            :disabled="drawBusy || activeItems.length === 0"
            class="min-w-36 border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
            @click="draw"
          >
            <Sparkles class="size-4" />
            {{ drawBusy ? "抽取中…" : "开始抽取" }}
          </Button>
        </div>

        <div v-if="items.length" class="flex w-full flex-wrap justify-center gap-2">
          <span
            v-for="item in items"
            :key="item.id"
            class="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground dark:bg-input/30"
          >
            {{ nameText(item.name) }} · {{ item.ratio }}%
          </span>
        </div>
      </section>

      <!-- 大转盘 -->
      <section
        v-if="tab === 'wheel'"
        class="flex flex-col items-center gap-4"
        aria-label="大转盘"
      >
        <div class="relative size-72 sm:size-80">
          <!-- 指针（固定不动） -->
          <div
            class="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path
                d="M12 2 L19 20 L12 16 L5 20 Z"
                fill="hsl(var(--foreground))"
                stroke="hsl(var(--background))"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <!-- 旋转轮盘 -->
          <div
            class="size-full rounded-full bg-muted shadow-lg ring-1 ring-border"
            :style="wheelStyle"
          >
            <svg viewBox="0 0 260 260" class="size-full" aria-hidden="true">
              <template v-if="wheelSlices.length > 1">
                <path
                  v-for="s in wheelSlices"
                  :key="s.id"
                  :d="s.path"
                  :fill="s.color"
                  stroke="hsl(var(--card))"
                  stroke-width="1.5"
                />
                <text
                  v-for="s in wheelSlices"
                  :key="s.id"
                  :x="s.label.x"
                  :y="s.label.y"
                  :transform="`rotate(${s.label.rotate} ${s.label.x} ${s.label.y})`"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="fill-white"
                  font-size="12.5"
                  font-weight="600"
                  style="paint-order: stroke; stroke: rgba(0, 0, 0, 0.35); stroke-width: 2px;"
                >
                  {{ nameText(s.name) }}
                </text>
              </template>
              <template v-else-if="wheelSlices.length === 1">
                <circle
                  cx="130"
                  cy="130"
                  r="126"
                  :fill="wheelSlices[0].color"
                  stroke="hsl(var(--card))"
                  stroke-width="1.5"
                />
                <text
                  x="130"
                  y="130"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="fill-white"
                  font-size="15"
                  font-weight="600"
                  style="paint-order: stroke; stroke: rgba(0, 0, 0, 0.35); stroke-width: 2px;"
                >
                  {{ nameText(wheelSlices[0].name) }}
                </text>
              </template>
            </svg>
          </div>

          <!-- 中心「转」按钮 -->
          <Button
            type="button"
            :disabled="spinning || wheelSlices.length === 0"
            class="absolute inset-0 z-10 m-auto size-16 rounded-full text-xl font-bold shadow-xl"
            :aria-label="spinning ? '转动中' : '转'"
            @click="spin"
          >
            {{ spinning ? "…" : "转" }}
          </Button>
        </div>

        <p
          v-if="items.length === 0"
          class="text-sm text-muted-foreground"
          role="status"
        >
          列表为空，先在上方添加选项喵～
        </p>
        <p
          v-else-if="lastForce !== null"
          class="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          本次力度
          <span class="font-medium text-foreground">{{ lastForce }}</span>
          度（每转一度消耗一个力）
          <span v-if="lastWinner" class="ml-2 text-base font-semibold text-foreground">
            命中：{{ nameText(lastWinner?.name ?? "") }}
          </span>
        </p>
        <p v-else class="text-sm text-muted-foreground">
          点击中间「转」roll 出 720–2160 的力度并转动喵～
        </p>
      </section>

      <Alert>
        <Info class="size-4" />
        <AlertDescription>
          点击「转」会随机 roll 出 720–2160 的力度（单位：度），轮盘随后顺时针旋转
          与力度相等的度数——每转一度消耗一个力。列表占比默认平分，可手动调整为任意百分比，
          轮盘扇区大小与抽取概率都会按占比变化喵～
        </AlertDescription>
      </Alert>
    </div>
  </ToolLayout>
</template>


