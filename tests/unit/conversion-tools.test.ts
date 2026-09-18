/**
 * 转换工具纯逻辑单元测试。
 *
 * 说明：WASM 引擎（ffmpeg / pandoc）与 Canvas 转换依赖浏览器能力，
 * 不在单测中发起真实下载 / 解码，只覆盖可离线验证的纯函数。
 */
import { describe, expect, it } from "vitest";
import { imageFormats, imageOutputName } from "@/lib/conversion/image";
import { videoPresets } from "@/lib/conversion/video";

describe("图片转换：输出文件名", () => {
  it("保留主名并替换扩展名", () => {
    expect(imageOutputName("photo.png", imageFormats[1])).toBe("photo.jpg");
    expect(imageOutputName("archive.photo.webp", imageFormats[2])).toBe(
      "archive.photo.webp",
    );
  });

  it("无扩展名文件也能生成输出名", () => {
    expect(imageOutputName("noext", imageFormats[0])).toBe("noext.png");
  });

  it("格式列表包含 PNG/JPEG/WebP/AVIF/BMP", () => {
    expect(imageFormats.map((f) => f.id)).toEqual([
      "png",
      "jpeg",
      "webp",
      "avif",
      "bmp",
    ]);
  });
});

describe("视频转换：输出预设", () => {
  it("预设包含常见容器与音频提取", () => {
    const ids = videoPresets.map((p) => p.id);
    expect(ids).toContain("mp4");
    expect(ids).toContain("webm");
    expect(ids).toContain("mkv");
    expect(ids).toContain("gif");
    expect(ids).toContain("mp3");
    expect(ids).toContain("aac");
    expect(ids).toContain("wav");
  });

  it("每个预设都有扩展名与 MIME，且参数非空", () => {
    for (const preset of videoPresets) {
      expect(preset.ext).toMatch(/^[a-z0-9]+$/);
      expect(preset.mime).toContain("/");
      expect(preset.args.length).toBeGreaterThan(0);
    }
  });

  it("音频提取预设不保留视频流（-vn）", () => {
    for (const preset of videoPresets.filter((p) => p.mime.startsWith("audio/"))) {
      expect(preset.args).toContain("-vn");
    }
  });
});
