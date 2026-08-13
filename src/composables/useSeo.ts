import { useHead, useSeoMeta } from "@unhead/vue";
import { computed, toValue, type MaybeRefOrGetter } from "vue";

/** 站点基础 URL（生产环境） */
const SITE_URL = "https://meali.top";
/** 站点名称 */
const SITE_NAME = "VoidCat";
/** 默认 OG 图片（fallback: 头像） */
const DEFAULT_OG_IMAGE = `${SITE_URL}/avatar-52491de8.webp`;

export interface UseSeoInput {
  /** 页面标题（自动追加 " - VoidCat" 后缀） */
  title: MaybeRefOrGetter<string>;
  /** Meta 描述 */
  description: MaybeRefOrGetter<string>;
  /** OG/Twitter 图片 URL；未提供时 fallback 到默认头像 */
  image?: MaybeRefOrGetter<string | null | undefined>;
  /** 页面路径（相对站点根），如 "/posts/my-post" */
  path?: MaybeRefOrGetter<string>;
  /** "website"（默认）或 "article"（启用 JSON-LD Article 结构化数据） */
  type?: "website" | "article";
  /** ISO 日期字符串 YYYY-MM-DD，article 类型时用于 datePublished */
  publishedTime?: MaybeRefOrGetter<string | undefined>;
  /** 标签列表，article 类型时用于 JSON-LD keywords */
  tags?: MaybeRefOrGetter<string[]>;
}

/**
 * 统一注入页面级 SEO 元数据。
 *
 * - 标题自动追加 " - VoidCat" 后缀
 * - 自动设置 OG / Twitter Card / canonical URL
 * - type: "article" 时自动注入 JSON-LD Article 结构化数据
 */
export function useSeo(input: UseSeoInput) {
  const title = computed(() => `${toValue(input.title)} - ${SITE_NAME}`);
  const description = computed(() => toValue(input.description));
  const image = computed(() => toValue(input.image) || DEFAULT_OG_IMAGE);
  const url = computed(() =>
    input.path ? `${SITE_URL}${toValue(input.path)}` : SITE_URL,
  );
  const type = input.type ?? "website";

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: image,
    ogUrl: url,
    ogType: type,
    ogLocale: "zh_CN",
    ogSiteName: SITE_NAME,
    twitterCard: "summary_large_image",
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
  });

  useHead({
    link: [{ rel: "canonical", href: url }],
  });

  // JSON-LD Article 结构化数据（unhead 3.x 使用 textContent 自动序列化对象）
  if (type === "article") {
    useHead({
      script: [
        {
          type: "application/ld+json",
          textContent: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: toValue(title),
            description: toValue(description),
            image: toValue(image),
            datePublished: toValue(input.publishedTime),
            author: { "@type": "Person", name: SITE_NAME },
            ...(input.tags && toValue(input.tags).length > 0
              ? { keywords: toValue(input.tags).join(", ") }
              : {}),
          },
        },
      ],
    });
  }
}