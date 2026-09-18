/**
 * 视频 / 音频转换（ffmpeg.wasm）。
 *
 * 设计：ffmpeg-core（单线程版）wasm 约 32MB，不随站点打包，首次使用时从
 * jsdmirror CDN 下载（jsDelivr 国内镜像，实测单文件上限 50MB，ffmpeg-core 32MB 可过；
 * 经 toBlobURL 转成本地 blob 地址，规避 Worker 跨域限制）；
 * 加载失败时抛 WasmUnavailableError，页面展示「WASM 不可用」提示。
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { WasmUnavailableError } from "./wasm";

/** 与 @ffmpeg/ffmpeg 兼容的 core 版本（CDN 固定版本，避免漂移） */
const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_CORE_BASE = `https://cdn.jsdmirror.com/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

export interface VideoPreset {
  id: string;
  label: string;
  /** 输出扩展名 */
  ext: string;
  mime: string;
  /** ffmpeg 输出参数（不含 -i / 输出文件名） */
  args: string[];
  note?: string;
}

export const videoPresets: VideoPreset[] = [
  {
    id: "mp4",
    label: "MP4（H.264 + AAC）",
    ext: "mp4",
    mime: "video/mp4",
    args: ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac"],
    note: "兼容性最好",
  },
  {
    id: "webm",
    label: "WebM（VP9 + Opus）",
    ext: "webm",
    mime: "video/webm",
    args: ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus"],
  },
  {
    id: "mkv",
    label: "MKV（H.264 + AAC）",
    ext: "mkv",
    mime: "video/x-matroska",
    args: ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac"],
  },
  {
    id: "gif",
    label: "GIF 动图",
    ext: "gif",
    mime: "image/gif",
    args: ["-vf", "fps=15,scale=480:-1:flags=lanczos", "-loop", "0"],
    note: "输出为动图，体积较大",
  },
  {
    id: "mp3",
    label: "MP3（提取音频）",
    ext: "mp3",
    mime: "audio/mpeg",
    args: ["-vn", "-c:a", "libmp3lame", "-q:a", "4"],
  },
  {
    id: "aac",
    label: "AAC（提取音频）",
    ext: "aac",
    mime: "audio/aac",
    args: ["-vn", "-c:a", "aac"],
  },
  {
    id: "ogg",
    label: "OGG Opus（提取音频）",
    ext: "ogg",
    mime: "audio/ogg",
    args: ["-vn", "-c:a", "libopus"],
  },
  {
    id: "wav",
    label: "WAV（提取音频）",
    ext: "wav",
    mime: "audio/wav",
    args: ["-vn", "-c:a", "pcm_s16le"],
  },
];

let ffmpegPromise: Promise<FFmpeg> | null = null;

/** 加载 ffmpeg 实例（单例缓存；失败后允许重试） */
export async function loadFFmpeg(): Promise<FFmpeg> {
  ffmpegPromise ??= loadFFmpegBinary();
  try {
    return await ffmpegPromise;
  } catch (err) {
    ffmpegPromise = null;
    throw err;
  }
}

async function loadFFmpegBinary(): Promise<FFmpeg> {
  let ffmpeg: FFmpeg;
  try {
    // Node 测试环境会抛 "ffmpeg.wasm does not support nodejs"，统一映射为不可用提示
    ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${FFMPEG_CORE_BASE}/ffmpeg-core.js`,
        "text/javascript",
      ),
      wasmURL: await toBlobURL(
        `${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });
  } catch {
    throw new WasmUnavailableError();
  }
  return ffmpeg;
}

/** 转码：输入文件 → 指定预设，返回输出字节 */
export async function convertVideo(
  file: File,
  preset: VideoPreset,
  inputName: string,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; outputName: string }> {
  const ffmpeg = await loadFFmpeg();
  const outputName = `${inputName.replace(/\.[^.]+$/, "")}.${preset.ext}`;
  // 清理可能残留的同名文件（同一实例复用）
  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);
  const input = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, input);
  await ffmpeg.exec(["-i", inputName, ...preset.args, outputName]);
  const data = await ffmpeg.readFile(outputName);

  // readFile 可能返回文本（encoding 场景）；这里固定按字节处理并复制到 ArrayBuffer 上

  const bytes = typeof data === "string"

    ? new TextEncoder().encode(data)

    : (new Uint8Array(data) as Uint8Array<ArrayBuffer>);

  return { bytes, outputName };
}
