// CSVの列名を日本語ベースから内部キーに自動マッピング
// 業務で使うCSVは「会社名」「住所」「電話番号」「担当者」のように日本語のことが多い

function normHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/[\s_・（）()「」【】\[\]'":：、,。\-]/g, "")
    .trim();
}

export type CsvTargetKey =
  | "company_name"
  | "address"
  | "ward"
  | "city"
  | "prefecture"
  | "phone"
  | "industry"
  | "contact_time"
  | "contact_person_type"
  | "call_result"
  | "call_temperature"
  | "complaint_risk"
  | "visit_allowed"
  | "memo"
  | "website_url"
  | "nearest_station"
  | "external_id";

const COL_ALIASES: Record<CsvTargetKey, string[]> = {
  company_name: [
    "company_name",
    "companyname",
    "会社名",
    "法人名",
    "社名",
    "企業名",
    "店舗名",
    "屋号",
    "名前",
    "顧客名",
    "取引先名",
  ],
  address: [
    "address",
    "住所",
    "所在地",
    "アドレス",
    "事業所住所",
    "住所１",
    "住所1",
  ],
  ward: ["ward", "市区町村", "市区", "区", "町村", "エリア", "地域"],
  city: ["city", "市", "都市"],
  prefecture: ["prefecture", "都道府県", "県"],
  phone: [
    "phone",
    "電話番号",
    "電話",
    "tel",
    "テル",
    "連絡先",
    "電話番号1",
    "tel1",
    "電番",
  ],
  industry: [
    "業種細分類",
    "業種小分類",
    "業種中分類",
    "業種大分類",
    "業界細分類",
    "業界小分類",
    "業界中分類",
    "業界大分類",
    "industry",
    "業種",
    "業界",
    "業態",
    "カテゴリ",
    "ジャンル",
  ],
  contact_time: [
    "contact_time",
    "contacttime",
    "接触日時",
    "架電日時",
    "通話日時",
    "発信日時",
    "接触日",
    "コール日時",
    "発信時刻",
    "通話時刻",
    "通話開始",
    "対応日時",
    "日時",
    "日付",
    "対応日",
    "電話日",
  ],
  contact_person_type: [
    "contact_person_type",
    "contactpersontype",
    "接触相手",
    "対応者",
    "対応相手",
    "相手",
    "役職",
    "接触対象",
    "担当",
    "担当者",
    "出た人",
  ],
  call_result: [
    "call_result",
    "callresult",
    "結果",
    "アポ結果",
    "通話結果",
    "テレアポ結果",
    "ng理由",
    "ngりゆう",
    "応対結果",
    "ステータス",
    "結果グループ",
  ],
  call_temperature: [
    "call_temperature",
    "calltemperature",
    "温度感",
    "温度",
    "確度",
    "見込み度",
    "見込度",
  ],
  complaint_risk: [
    "complaint_risk",
    "complaintrisk",
    "クレームリスク",
    "クレーム度",
    "クレーム",
  ],
  visit_allowed: [
    "visit_allowed",
    "visitallowed",
    "訪問可否",
    "訪問可",
    "訪問ok",
  ],
  memo: [
    "memo",
    "備考",
    "メモ",
    "コメント",
    "詳細",
    "備考メモ",
    "ngメモ",
    "ng内容",
    "理由",
  ],
  website_url: [
    "website_url",
    "websiteurl",
    "url",
    "ホームページ",
    "サイト",
    "hp",
  ],
  nearest_station: [
    "nearest_station",
    "neareststation",
    "最寄駅",
    "駅",
    "最寄り駅",
  ],
  external_id: [
    "external_id",
    "externalid",
    "id",
    "顧客id",
    "ngid",
    "管理番号",
    "no",
    "no.",
  ],
};

// 規模感の列名（任意列）
export const SIZE_ALIASES = [
  "size",
  "規模",
  "規模感",
  "会社規模",
  "従業員数",
  "従業員",
  "資本金",
  "売上",
];

export function findSizeColumn(headers: string[]): string | null {
  const normHeaders = headers.map((h) => ({ raw: h, n: normHeader(h) }));
  for (const a of SIZE_ALIASES.map(normHeader)) {
    const hit = normHeaders.find((h) => h.n === a);
    if (hit) return hit.raw;
  }
  for (const a of SIZE_ALIASES.map(normHeader)) {
    const hit = normHeaders.find(
      (h) => h.n.length >= 2 && (h.n.includes(a) || a.includes(h.n)),
    );
    if (hit) return hit.raw;
  }
  return null;
}

export type ColumnMap = Partial<Record<CsvTargetKey, string>>;

export function buildColumnMap(headers: string[]): ColumnMap {
  const normHeaders = headers.map((h) => ({ raw: h, n: normHeader(h) }));
  const result: ColumnMap = {};
  const used = new Set<string>();

  // 1. 完全一致（エイリアス優先順位で：細分類>大分類など）
  for (const [target, aliases] of Object.entries(COL_ALIASES)) {
    const normAliases = aliases.map(normHeader);
    outer: for (const a of normAliases) {
      for (const h of normHeaders) {
        if (used.has(h.raw)) continue;
        if (h.n === a) {
          result[target as CsvTargetKey] = h.raw;
          used.add(h.raw);
          break outer;
        }
      }
    }
  }

  // 2. 部分一致（残りのフィールドのみ、エイリアス優先順）
  for (const [target, aliases] of Object.entries(COL_ALIASES)) {
    if (result[target as CsvTargetKey]) continue;
    const normAliases = aliases.map(normHeader);
    outer: for (const a of normAliases) {
      for (const h of normHeaders) {
        if (used.has(h.raw)) continue;
        if (h.n.length < 2) continue;
        if (h.n.includes(a) || a.includes(h.n)) {
          result[target as CsvTargetKey] = h.raw;
          used.add(h.raw);
          break outer;
        }
      }
    }
  }

  return result;
}

export function getCell(
  row: Record<string, string>,
  map: ColumnMap,
  target: CsvTargetKey,
): string {
  const src = map[target];
  if (!src) return "";
  return (row[src] ?? "").toString().trim();
}

// 全角英数→半角英数（正規化用）
export function toHalfWidth(s: string): string {
  if (!s) return "";
  return s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
}

// 業種文字列の先頭コード除去（"E製造業" → "製造業"、"0995冷凍調理食品製造業" → "冷凍調理食品製造業"）
export function cleanIndustry(s: string): string {
  if (!s) return "";
  return s.replace(/^[A-Za-z0-9]+\s*/, "").trim();
}

// バイトバッファを賢くデコード（UTF-8 → Shift_JIS の順で試す）
export function decodeBuffer(buf: ArrayBuffer): {
  text: string;
  encoding: "utf-8" | "shift_jis" | "fallback";
} {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return { text, encoding: "utf-8" };
  } catch {}
  try {
    const text = new TextDecoder("shift_jis").decode(buf);
    return { text, encoding: "shift_jis" };
  } catch {}
  return {
    text: new TextDecoder("utf-8", { fatal: false }).decode(buf),
    encoding: "fallback",
  };
}

// 住所セカンダリ列（住所２）を取得：colMapには含まれないので別途
export function getAddress2(row: Record<string, string>): string {
  const keys = Object.keys(row);
  for (const k of keys) {
    const nk = k.replace(/^\ufeff/, "").trim();
    if (nk === "住所２" || nk === "住所2" || nk === "住所 2") {
      return (row[k] ?? "").toString().trim();
    }
  }
  return "";
}

// 文字列を日付として解釈：複数フォーマットに対応
export function parseFlexibleDate(s: string): Date | null {
  if (!s) return null;
  let t = s.trim();
  if (!t) return null;
  // 全角→半角
  t = t.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  // よくある日本式区切り：「2025年5月28日 13:45」「2025/05/28 13:45」「2025.05.28」
  t = t
    .replace(/年|月/g, "-")
    .replace(/日/g, " ")
    .replace(/[./]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  // 末尾の「-」削除
  t = t.replace(/-+\s*$/g, "");
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d;
  // 数字のみ（YYMMDD or YYYYMMDD or YYYYMMDDhhmm）
  const digits = s.replace(/\D/g, "");
  if (digits.length === 6) {
    // 26 0528 → 2026-05-28
    const y = 2000 + parseInt(digits.slice(0, 2), 10);
    const mo = parseInt(digits.slice(2, 4), 10);
    const d2 = parseInt(digits.slice(4, 6), 10);
    const dd = new Date(y, mo - 1, d2);
    if (!isNaN(dd.getTime())) return dd;
  }
  if (digits.length === 8) {
    const y = parseInt(digits.slice(0, 4), 10);
    const mo = parseInt(digits.slice(4, 6), 10);
    const d2 = parseInt(digits.slice(6, 8), 10);
    const dd = new Date(y, mo - 1, d2);
    if (!isNaN(dd.getTime())) return dd;
  }
  return null;
}
