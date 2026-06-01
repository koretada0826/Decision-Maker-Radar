import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function minutesAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 60000);
}

export function humanMinutesAgo(iso: string | null | undefined): string {
  const m = minutesAgo(iso);
  if (m == null) return "—";
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return `${d}日前`;
}

export function googleMapsLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsDirectionsLink(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

// 住所を町名までで切る（番地以降をマスク）
// 例: "東京都豊島区池袋1丁目5-2" → "東京都豊島区池袋"
// 例: "熊本県熊本市南区南高江３−３−７６" → "熊本県熊本市南区南高江"
export function truncateAddressToArea(addr: string): string {
  if (!addr) return "";
  const m = addr.match(/^([^\d０-９]+)/);
  const head = m?.[1] ?? addr;
  // 末尾の「丁目」「番地」「町」みたいな単独語が残ったらそれも削る
  return head.replace(/[・\s]+$/, "").trim();
}

// 重複検知用のキー（同じ会社を異なる CSV から取り込んでも同じキーになる）
export function makeDedupKey(
  name: string,
  phone: string | null | undefined,
): string {
  const norm = (s: string) =>
    (s ?? "")
      .toLowerCase()
      .replace(/[\s\-―ー－()（）]/g, "")
      .replace(
        /株式会社|有限会社|合同会社|（株）|（有）|（合）|\(株\)|\(有\)|\(合\)/g,
        "",
      )
      .trim();
  return `${norm(name)}|${norm(phone ?? "")}`;
}
