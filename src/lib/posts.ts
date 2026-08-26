/**
 * 博客数据访问（客户端）。
 *
 * markdown → HTML 的渲染全部在构建期完成（vite-plugin-prerender-posts +
 * post-render.ts），客户端只同步读取预渲染数据，不再引入 shiki / markdown-it，
 * 也不再出现详情页的异步"加载中"状态。
 */
import { postsData } from "../generated/posts-data";
import type { GeneratedPostData } from "../generated/posts-data";
import type { Heading } from "./post-text";

export { countWords, slugify } from "./post-text";
export type { Heading } from "./post-text";

/** 博客元数据（列表页用） */
export interface PostMeta {
  /** 博客 id，即目录名与 url 路径 */
  id: string;
  /** 人类可读名称 */
  name: string;
  /** 描述/摘要（可选，空字符串表示无） */
  desc: string;
  /** 封面图 URL，无则 null */
  cover: string | null;
  /** 标签 */
  tag: string[];
  /** 创建时间 YYYY-MM-DD */
  createTime: string;
  /**
   * 正文字数（中文字符按字计、英文/数字按 word 计，已去除 markdown 标记与代码块）。
   * 构建期基于正文计算，列表页无需渲染即可展示。
   */
  wordCount: number;
}

/** 博客完整数据（详情页用，含构建期预渲染正文） */
export interface Post extends PostMeta {
  /** 构建期渲染后的 HTML */
  content: string;
  /** 文章标题大纲（h1-h6），目录组件消费 */
  headings: Heading[];
}

/** GeneratedPostData → PostMeta */
function toMeta(d: GeneratedPostData): PostMeta {
  return {
    id: d.id,
    name: d.name,
    desc: d.desc,
    cover: d.cover,
    tag: d.tag,
    createTime: d.createTime,
    wordCount: d.wordCount,
  };
}

/** GeneratedPostData → Post */
function toPost(d: GeneratedPostData): Post {
  return {
    ...toMeta(d),
    content: d.content,
    headings: d.headings,
  };
}

/** 获取所有博客元数据（列表页用，同步） */
export function getAllPosts(): PostMeta[] {
  return postsData.map(toMeta);
}

/**
 * 获取单篇博客（同步：数据来自构建期预渲染，无需异步加载 shiki）。
 * 不存在的 id 返回 null。
 */
export function getPost(id: string): Post | null {
  const d = postsData.find((p) => p.id === id);
  return d ? toPost(d) : null;
}
