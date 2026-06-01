// 決裁者レーダーのアプリアイコンを生成するスクリプト
// レーダー風デザイン：濃紺ベースに金色のサークル + スイープライン + ブリップ
// 実行：node scripts/generate-icons.mjs

import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

function radarSvg(size, padding = 0.1) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = (size / 2) * (1 - padding);
  const midR = outerR * 0.66;
  const innerR = outerR * 0.33;
  const stroke = Math.max(2, size / 64);
  const dotR = Math.max(4, size / 36);
  const sweepEndX = cx + outerR * Math.cos((-Math.PI * 1) / 4);
  const sweepEndY = cy + outerR * Math.sin((-Math.PI * 1) / 4);
  const blipR = outerR * 0.7;
  const blipX = cx + blipR * Math.cos((-Math.PI * 1) / 4);
  const blipY = cy + blipR * Math.sin((-Math.PI * 1) / 4);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0F172A"/>
  <circle cx="${cx}" cy="${cy}" r="${outerR}" stroke="#FBBF24" stroke-width="${stroke}" fill="none" opacity="0.9"/>
  <circle cx="${cx}" cy="${cy}" r="${midR}" stroke="#FBBF24" stroke-width="${stroke * 0.7}" fill="none" opacity="0.55"/>
  <circle cx="${cx}" cy="${cy}" r="${innerR}" stroke="#FBBF24" stroke-width="${stroke * 0.6}" fill="none" opacity="0.4"/>
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - outerR}" stroke="#FBBF24" stroke-width="${stroke * 0.4}" opacity="0.35"/>
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + outerR}" stroke="#FBBF24" stroke-width="${stroke * 0.4}" opacity="0.35"/>
  <line x1="${cx - outerR}" y1="${cy}" x2="${cx + outerR}" y2="${cy}" stroke="#FBBF24" stroke-width="${stroke * 0.4}" opacity="0.35"/>
  <line x1="${cx}" y1="${cy}" x2="${sweepEndX}" y2="${sweepEndY}" stroke="#FBBF24" stroke-width="${stroke * 1.6}" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="${dotR * 0.8}" fill="#FBBF24"/>
  <circle cx="${blipX}" cy="${blipY}" r="${dotR}" fill="#FBBF24"/>
  <circle cx="${blipX}" cy="${blipY}" r="${dotR * 1.8}" fill="#FBBF24" opacity="0.3"/>
</svg>`;
}

const targets = [
  { name: "icon-192.png", size: 192, padding: 0.08 },
  { name: "icon-512.png", size: 512, padding: 0.08 },
  // maskable 用は safe zone 多めに
  { name: "icon-maskable-192.png", size: 192, padding: 0.18 },
  { name: "icon-maskable-512.png", size: 512, padding: 0.18 },
  // iOS（角丸はOSが付ける、padding控えめ）
  { name: "apple-touch-icon.png", size: 180, padding: 0.08 },
  // ファビコン
  { name: "favicon-32.png", size: 32, padding: 0.08 },
];

for (const t of targets) {
  const svg = radarSvg(t.size, t.padding);
  await sharp(Buffer.from(svg)).png().toFile(`public/icons/${t.name}`);
  console.log(`✓ ${t.name}`);
}

console.log("\nDone.");
