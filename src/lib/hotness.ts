// 接触時間ベースのホットネスランク・価格システム
// プラチナ（1時間以内 / ¥1,000）
// エメラルド（3時間以内 / ¥600）
// シルバー（3時間超 / ¥200）
// 再購入は半額

export type HotnessRank = "platinum" | "emerald" | "silver";

export const HOTNESS_PRICE: Record<HotnessRank, number> = {
  platinum: 1000,
  emerald: 600,
  silver: 200,
};

// 再購入（更新版）の価格は全ランク共通：¥1,000 の半額 = ¥500
export const REPURCHASE_PRICE = 500;

export const HOTNESS_LABEL: Record<HotnessRank, string> = {
  platinum: "プラチナ",
  emerald: "エメラルド",
  silver: "シルバー",
};

// Tailwindクラス。輝度ヒエラルキー：プラチナ(濃黒)＞エメラルド(濃緑)＞シルバー(明灰)
// プラチナのring色は半額(amber-500)と区別するためamber-300に統一
export const HOTNESS_STYLE: Record<
  HotnessRank,
  { badge: string; ring: string }
> = {
  platinum: {
    badge:
      "bg-slate-900 text-amber-300 border border-amber-300 shadow-sm",
    ring: "ring-2 ring-amber-300 shadow-md",
  },
  emerald: {
    badge: "bg-emerald-700 text-white border border-emerald-800",
    ring: "ring-2 ring-emerald-500",
  },
  silver: {
    badge: "bg-slate-100 text-slate-600 border border-slate-300",
    ring: "",
  },
};

export function computeHotness(
  contactTime: string | Date,
  now?: number,
): HotnessRank {
  const ct =
    typeof contactTime === "string" ? new Date(contactTime) : contactTime;
  const reference = now ?? Date.now();
  const minutes = (reference - ct.getTime()) / 60000;
  if (minutes <= 60) return "platinum";
  if (minutes <= 180) return "emerald";
  return "silver";
}

export function priceFor(
  hotness: HotnessRank,
  isRepurchase: boolean,
): number {
  if (isRepurchase) return REPURCHASE_PRICE;
  return HOTNESS_PRICE[hotness];
}
