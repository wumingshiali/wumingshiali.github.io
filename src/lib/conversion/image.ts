/**
 * 图片格式转换（浏览器原生 Canvas，无需 WASM）。
 *
 * 支持 PNG / JPEG / WebP / AVIF / BMP 互相转换；有损格式（JPEG/WebP/AVIF）
 * 提供质量参数。全部在本地完成，数据不离开当前设备。
 */
export interface ImageFormat {
  id: string;
  label: string;
  mime: string;
  ext: string;
  /** 有损格式支持质量参数 */
  lossy: boolean;
  note?: string;
}

export const imageFormats: ImageFormat[] = [
  { id: "png", label: "PNG", mime: "image/png", ext: "png", lossy: false },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg", ext: "jpg", lossy: true },
  { id: "webp", label: "WebP", mime: "image/webp", ext: "webp", lossy: true },
  {
    id: "avif",
    label: "AVIF",
    mime: "image/avif",
    ext: "avif",
    lossy: true,
    note: "部分浏览器不支持导出",
  },
  { id: "bmp", label: "BMP", mime: "image/bmp", ext: "bmp", lossy: false, note: "体积较大" },
];

/** 输出文件名：保留原文件主名，替换扩展名 */
export function imageOutputName(fileName: string, format: ImageFormat): string {
  return `${fileName.replace(/\.[^.]+$/, "")}.${format.ext}`;
}

/**
 * 把图片文件解码后重编码为目标格式。
 * @param file 任意浏览器可解码的图片（PNG/JPEG/WebP/GIF/BMP/AVIF…）
 * @param format 目标格式
 * @param quality 有损格式质量（0~1），无损格式忽略
 * @returns 目标格式 Blob 与原图尺寸
 */
export async function convertImage(
  file: File,
  format: ImageFormat,
  quality = 0.9,
): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("无法解码该图片，请确认文件是受支持的图片格式");
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("当前浏览器不支持 Canvas 2D，无法转换图片");
    // JPEG 无透明通道，先铺白底避免透明区域变黑
    if (format.mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, format.mime, format.lossy ? quality : undefined);
    });
    if (!blob) {
      throw new Error(`当前浏览器不支持导出 ${format.label} 格式，请换一种格式`);
    }
    return { blob, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
