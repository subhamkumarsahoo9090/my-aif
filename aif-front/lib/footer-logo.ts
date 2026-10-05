import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const cache = new Map<string, string>();

export async function footerLogoSrc(publicPath: string) {
  const cached = cache.get(publicPath);
  if (cached) return cached;

  const file = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  const input = await readFile(file);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [keyR, keyG, keyB] = backgroundKey(data);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = markAlpha(data[i], data[i + 1], data[i + 2], keyR, keyG, keyB);
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = alpha;
  }

  const png = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const src = `data:image/png;base64,${png.toString("base64")}`;
  cache.set(publicPath, src);
  return src;
}

function backgroundKey(data: Buffer) {
  const counts = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let best = "0,0,0";
  let count = 0;
  for (const [key, total] of counts) {
    if (total > count) {
      best = key;
      count = total;
    }
  }

  return best.split(",").map(Number) as [number, number, number];
}

function markAlpha(r: number, g: number, b: number, keyR: number, keyG: number, keyB: number) {
  const channels = [
    (r - keyR) / (255 - keyR),
    (g - keyG) / (255 - keyG),
    (b - keyB) / (255 - keyB),
  ];
  const alpha = channels.reduce((sum, value) => sum + value, 0) / channels.length;
  return Math.round(Math.min(1, Math.max(0, alpha)) * 255);
}
