<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Check,
  Copy,
  Download,
  FolderPlus,
  Info,
  ListPlus,
  Plus,
  RefreshCcw,
  Trash2,
  Upload,
} from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import {
  createEmptyCategory,
  createEmptyItem,
  normalizeEditable,
  parseRankingsToml,
  sanitizeScore,
  serializeRankingsToml,
  type RankingCategory,
  type RankingItem,
} from "@/lib/tools/ranking";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "排名生成",
  description:
    "可视化编辑排名数据（分类 + 条目 + 分数），支持 TOML 导入导出，生成后粘贴回仓库的 data.toml 即可发布。",
  path: "/tools/other/ranking",
});

type Tab = "edit" | "io";
const tab = ref<Tab>("edit");

// ---------- 编辑状态 ----------
const categories = ref<RankingCategory[]>([]);
const selectedIndex = ref(0);
const selected = computed(() => categories.value[selectedIndex.value] ?? null);

/** 示例数据：让工具打开即有内容，且覆盖多个等级便于预览 */
function seed() {
  categories.value = normalizeEditable([
    {
      id: "food",
      name: "美食",
      description: "浮浮酱吃过的美食排名喵～",
      items: [
        { name: "火锅", brief: "麻辣鲜香", comment: "聚会首选", score: 95 },
        { name: "烧烤", brief: "烟火气十足", comment: "夏天的夜晚必备", score: 88 },
        { name: "沙拉", brief: "清爽低卡", comment: "减肥期勉强接受", score: 55 },
      ],
    },
    {
      id: "games",
      name: "游戏",
      description: "玩过的游戏主观排名",
      items: [
        { name: "塞尔达传说", brief: "开放世界天花板", comment: "时间杀手", score: 97 },
        { name: "某抽卡手游", brief: "每天上线清体力", comment: "钱包火葬场", score: 63 },
      ],
    },
  ]);
  selectedIndex.value = 0;
}
seed();

function selectCategory(index: number) {
  selectedIndex.value = index;
}

/** 生成不与现有分类冲突的 id（自动新增的分类名多为中文，slugify 后需兜底） */
function uniqueCategoryId(): string {
  const existing = new Set(categories.value.map((c) => c.id));
  let id = "category";
  let n = 2;
  while (existing.has(id)) {
    id = `category-${n}`;
    n += 1;
  }
  return id;
}

function addCategory() {
  const category = createEmptyCategory(`新分类${categories.value.length + 1}`);
  category.id = uniqueCategoryId();
  categories.value.push(category);
  selectedIndex.value = categories.value.length - 1;
}

function removeCategory(index: number) {
  if (categories.value.length <= 1) return;
  categories.value.splice(index, 1);
  if (selectedIndex.value >= categories.value.length) {
    selectedIndex.value = categories.value.length - 1;
  }
}

function addItem() {
  selected.value?.items.push(createEmptyItem());
}

function removeItem(index: number) {
  selected.value?.items.splice(index, 1);
}

/** 分数输入：钳制到 0-100（模板里不能写 TS 断言，收敛到脚本） */
function onScoreInput(item: RankingItem, event: Event) {
  item.score = sanitizeScore((event.target as HTMLInputElement).value);
}

// ---------- 导入导出 ----------
const importText = ref("");
const importMessage = ref<{ ok: boolean; text: string } | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function doImport(raw: string) {
  try {
    const parsed = parseRankingsToml(raw);
    categories.value = normalizeEditable(parsed);
    selectedIndex.value = 0;
    importMessage.value = { ok: true, text: `导入成功：${parsed.length} 个分类` };
  } catch (error) {
    importMessage.value = {
      ok: false,
      text: error instanceof Error ? error.message : String(error),
    };
  }
}

function onImport() {
  doImport(importText.value);
}

function onFileImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => doImport(String(reader.result ?? ""));
  reader.readAsText(file);
  input.value = "";
}

const exportedToml = computed(() => serializeRankingsToml(categories.value));

const copyState = ref<"idle" | "copied">("idle");
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const exportTextarea = ref<HTMLTextAreaElement | null>(null);

async function copyToml() {
  try {
    await navigator.clipboard.writeText(exportedToml.value);
  } catch {
    // 降级：选中文本框复制（旧浏览器 / 无剪贴板权限环境）
    const el = exportTextarea.value;
    if (el) {
      el.focus();
      el.select();
      document.execCommand("copy");
    }
  }
  copyState.value = "copied";
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copyState.value = "idle"), 2000);
}

function downloadToml() {
  const blob = new Blob([exportedToml.value], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rankings.toml";
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <ToolLayout
    title="排名生成"
    description="可视化编辑排名数据，支持 TOML 导入导出，生成后粘贴回仓库即可发布喵～"
    back-to="/tools/other"
    back-label="返回其他工具"
  >
    <div class="flex w-full max-w-3xl flex-col gap-4">
      <!-- 模式切换：编辑 / 导入导出 -->
      <div
        class="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/60 p-1"
        role="tablist"
        aria-label="排名生成模式"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'edit'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'edit'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="tab = 'edit'"
        >
          <ListPlus class="size-4" />
          编辑
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="tab === 'io'"
          class="flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'io'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="tab = 'io'"
        >
          <Upload class="size-4" />
          导入导出
        </button>
      </div>

      <!-- 编辑：分类选择 + 分类设置 + 条目列表 -->
      <section
        v-if="tab === 'edit'"
        class="flex flex-col gap-3"
        aria-label="编辑排名"
      >
        <!-- 分类选择 -->
        <div class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <FolderPlus class="size-4" />
              <h2 class="text-sm font-medium">分类</h2>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
              @click="addCategory"
            >
              <Plus class="size-3.5" />
              新增分类
            </Button>
          </div>
          <div v-if="categories.length" class="flex flex-wrap gap-2">
            <button
              v-for="(category, index) in categories"
              :key="index"
              type="button"
              class="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
              :class="
                index === selectedIndex
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              "
              @click="selectCategory(index)"
            >
              {{ category.name || `分类 ${index + 1}` }}
            </button>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            还没有分类，点「新增分类」开始喵～
          </p>
        </div>

        <!-- 分类设置 -->
        <div
          v-if="selected"
          class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <ListPlus class="size-4" />
              <h2 class="text-sm font-medium">分类设置</h2>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              class="text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="categories.length <= 1"
              @click="removeCategory(selectedIndex)"
            >
              <Trash2 class="size-3.5" />
              删除分类
            </Button>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs text-muted-foreground">id（URL 用，小写字母/数字/连字符）</span>
              <input
                v-model="selected.id"
                data-slot="input"
                class="flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="分类 id"
              />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs text-muted-foreground">名称</span>
              <input
                v-model="selected.name"
                data-slot="input"
                class="flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                aria-label="分类名称"
              />
            </label>
          </div>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs text-muted-foreground">描述（可选）</span>
            <input
              v-model="selected.description"
              data-slot="input"
              class="flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              aria-label="分类描述"
            />
          </label>
        </div>

        <!-- 条目列表 -->
        <div
          v-if="selected"
          class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <ListPlus class="size-4" />
              <h2 class="text-sm font-medium">条目（{{ selected.items.length }}）</h2>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
              @click="addItem"
            >
              <Plus class="size-3.5" />
              新增条目
            </Button>
          </div>

          <div v-if="selected.items.length" class="flex flex-col gap-2">
            <div
              v-for="(item, index) in selected.items"
              :key="index"
              class="grid grid-cols-1 items-center gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_1fr_1fr_4.5rem_2.5rem]"
            >
              <input
                v-model="item.name"
                data-slot="input"
                class="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                placeholder="名称"
                aria-label="条目名称"
              />
              <input
                v-model="item.brief"
                data-slot="input"
                class="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                placeholder="简洁描述"
                aria-label="条目简洁"
              />
              <input
                v-model="item.comment"
                data-slot="input"
                class="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                placeholder="评价"
                aria-label="条目评价"
              />
              <input
                type="number"
                :value="item.score"
                min="0"
                max="100"
                data-slot="input"
                class="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                aria-label="条目分数"
                @input="onScoreInput(item, $event)"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                class="text-muted-foreground hover:text-destructive"
                :aria-label="`删除 ${item.name || '条目'}`"
                @click="removeItem(index)"
              >
                <Trash2 class="size-4" />
              </Button>
            </div>
          </div>
          <p v-else class="text-sm text-muted-foreground">
            还没有条目，点「新增条目」开始喵～
          </p>
        </div>

        <div class="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
            @click="seed"
          >
            <RefreshCcw class="size-3.5" />
            重置示例
          </Button>
        </div>
      </section>

      <!-- 导入导出 -->
      <section
        v-if="tab === 'io'"
        class="flex flex-col gap-4"
        aria-label="导入导出"
      >
        <!-- 导入 -->
        <div class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
          <div class="flex items-center gap-2">
            <Upload class="size-4" />
            <h2 class="text-sm font-medium">导入 TOML</h2>
          </div>
          <textarea
            v-model="importText"
            rows="6"
            placeholder="粘贴 TOML 内容，或从文件导入…"
            class="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            aria-label="导入 TOML 内容"
          />
          <div class="flex flex-wrap gap-2">
            <Button type="button" @click="onImport">导入</Button>
            <Button type="button" variant="outline" @click="fileInput?.click()">
              从文件导入
            </Button>
            <input
              ref="fileInput"
              type="file"
              accept=".toml,.txt,text/plain"
              class="hidden"
              @change="onFileImport"
            />
          </div>
          <Alert v-if="importMessage" :variant="importMessage.ok ? 'default' : 'destructive'">
            <Check v-if="importMessage.ok" class="size-4" />
            <Info v-else class="size-4" />
            <AlertDescription>{{ importMessage.text }}</AlertDescription>
          </Alert>
        </div>

        <!-- 导出 -->
        <div class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30">
          <div class="flex items-center gap-2">
            <Download class="size-4" />
            <h2 class="text-sm font-medium">导出 TOML（{{ categories.length }} 个分类）</h2>
          </div>
          <textarea
            ref="exportTextarea"
            :value="exportedToml"
            readonly
            rows="10"
            class="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            aria-label="生成的 TOML"
          />
          <div class="flex flex-wrap gap-2">
            <Button type="button" @click="copyToml">
              <Copy class="size-4" />
              {{ copyState === "copied" ? "已复制" : "复制" }}
            </Button>
            <Button type="button" variant="outline" @click="downloadToml">
              <Download class="size-4" />
              下载 rankings.toml
            </Button>
          </div>
        </div>

        <Alert>
          <Info class="size-4" />
          <AlertDescription>
            把导出的 TOML 完整粘贴到仓库的
            <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">src/rankings/data.toml</code>
            并提交，排名页（/rankings）就会自动更新喵～
          </AlertDescription>
        </Alert>
      </section>
    </div>
  </ToolLayout>
</template>
