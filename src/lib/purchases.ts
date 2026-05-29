// 購入済みリード ID を localStorage に保存するヘルパー
// 本番化時は Supabase の purchases テーブルに置き換える

const PURCHASED_KEY = "kr-purchased-leads-v1";
const EMAIL_KEY = "kr-purchase-email-v1";

export const LEAD_PRICE_JPY = 1000;

export function getStoredEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setStoredEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMAIL_KEY, email);
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
    return raw ? (JSON.parse(raw) as string[]) : [];
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

// 住所マスク：「東京都○○区」までは見せて、その先はマスク
export function maskAddress(addr: string): string {
  if (!addr) return "";
  const m = addr.match(/^(.*?[都道府県])?(.*?[市区町村])/);
  if (m) {
    return `${m[1] ?? ""}${m[2]} ▒▒▒▒▒▒▒▒`;
  }
  return addr.slice(0, 8) + " ▒▒▒▒▒";
}
