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
  /** OG/Twitter 图片 URL；未提供时 fallback 到默认横幅 */
  image?: MaybeRefOrGetter<string | null | undefined>;
  /** 页面路径（相对站点根），如 "/posts/my-post" */
  path?: MaybeRefOrGetter<string>;
  /** "website"（默认）或 "article"（启用 JSON-LD Article 结构化数据） */
  type?: "website" | "article";
  /** ISO 日期字符串 YYYY-MM-DD，article 类型时用于 datePublished */
  publishedTime?: MaybeRefOrGetter<string | undefined>;
  /** ISO 日期字符串 YYYY-MM-DD，article 类型时用于 dateModified（缺省不输出） */
  modifiedTime?: MaybeRefOrGetter<string | undefined>;
  /** 标签列表，article 类型时用于 JSON-LD keywords / article:tag */
  tags?: MaybeRefOrGetter<string[]>;
  /** 正文字数，article 类型时用于 JSON-LD wordCount */
  wordCount?: MaybeRefOrGetter<number | undefined>;
}

/**
 * 统一注入页面级 SEO 元数据。
 *
 * - 标题自动追加 " - VoidCat" 后缀
 * - 自动设置 OG / Twitter Card / canonical URL / OG 图片 alt
 * - type: "article" 时自动注入 OG article 标签与 JSON-LD Article 结构化数据
 */
export function useSeo(input: UseSeoInput) {
  const title = computed(() => `${toValue(input.title)} - ${SITE_NAME}`);
  const description = computed(() => toValue(input.description));
  const image = computed(() => toValue(input.image) || DEFAULT_OG_IMAGE);
  const url = computed(() =>
    input.path ? `${SITE_URL}${toValue(input.path)}` : SITE_URL,
  );
  const type = input.type ?? "website";
  const publishedTime = computed(() => toValue(input.publishedTime));
  const modifiedTime = computed(() => toValue(input.modifiedTime));
  const tags = computed(() => toValue(input.tags) ?? []);
  const wordCount = computed(() => toValue(input.wordCount));
  // article:section 取首个标签作为栏目名（无标签时不输出）
  const section = computed(() => tags.value[0] ?? undefined);

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: image,
    ogImageAlt: title,
    ogUrl: url,
    ogType: type,
    ogLocale: "zh_CN",
    ogSiteName: SITE_NAME,
    twitterCard: "summary_large_image",
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
    // article 类型专属 OG 标签
    ...(type === "article"
      ? {
          articlePublishedTime: publishedTime,
          articleModifiedTime: modifiedTime,
          articleSection: section,
          articleTag: tags,
        }
      : {}),
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
            datePublished: publishedTime.value,
            ...(modifiedTime.value
              ? { dateModified: modifiedTime.value }
              : {}),
            ...(wordCount.value ? { wordCount: wordCount.value } : {}),
            author: {
              "@type": "Person",
              name: SITE_NAME,
              url: SITE_URL,
            },
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url.value },
            inLanguage: "zh-CN",
            ...(tags.value.length > 0 ? { keywords: tags.value.join(", ") } : {}),
          },
        },
      ],
    });
  }
}
