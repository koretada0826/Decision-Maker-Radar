// 購入済みリード ID を localStorage に保存するヘルパー
// 本番化時は Supabase の purchases テーブルに置き換える

const PURCHASED_KEY = "kr-purchased-leads-v1";
const PURCHASED_KEYS_KEY = "kr-purchased-dedup-keys-v1"; // 過去に買った企業のdedup_key集合
const EMAIL_KEY = "kr-purchase-email-v1";

// 後方互換用（旧コードからの参照）
export const LEAD_PRICE_JPY = 1000;

export function getStoredEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(EMAIL_KEY);
    return v ? v.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export function setStoredEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    localStorage.setItem(EMAIL_KEY, normalized);
  } catch {}
}

export function clearStoredEmail() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EMAIL_KEY);
  } catch {}
}

export function getPurchasedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PURCHASED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function setPurchasedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PURCHASED_KEY, JSON.stringify(ids));
  } catch {}
}

export function addPurchasedId(id: string) {
  if (typeof window === "undefined") return;
  const ids = getPurchasedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    setPurchasedIds(ids);
  }
}

export function removePurchasedId(id: string) {
  if (typeof window === "undefined") return;
  const ids = getPurchasedIds().filter((x) => x !== id);
  setPurchasedIds(ids);
}

// 過去に買った企業のdedup_key集合（CSV更新後の半額判定に使う）
export function getPurchasedDedupKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PURCHASED_KEYS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addPurchasedDedupKey(key: string) {
  if (typeof window === "undefined" || !key) return;
  const keys = getPurchasedDedupKeys();
  if (!keys.includes(key)) {
    keys.push(key);
    try {
      localStorage.setItem(PURCHASED_KEYS_KEY, JSON.stringify(keys));
    } catch {}
  }
}

// 住所マスク：「東京都○○区」までは見せて、その先はマスク
export function maskAddress(addr: string): string {
  if (!addr) return "";
  const m = addr.match(/^(.*?[都道府県])?(.*?[市区町村])/);
  if (m) {
    return `${m[1] ?? ""}${m[2]} ▒▒▒▒▒▒▒▒`;
  }
  return addr.slice(0, 8) + " ▒▒▒▒▒";
}
