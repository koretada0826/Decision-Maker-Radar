// 動的サンプルCSV生成エンドポイント
// アクセスした時刻を基準にコール日時を組み立てるので、
// 取り込むと必ずプラチナ・エメラルド・シルバーが揃う。

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Sample = {
  minutesAgo: number;
  name: string;
  postal: string;
  address1: string;
  address2: string;
  phone: string;
  major: string; // 業種大分類
  middle: string; // 業種中分類
  small: string; // 業種小分類
  detail: string; // 業種細分類
  result: string;
  memo: string;
};

// 15件：プラチナ5 + エメラルド5 + シルバー5
const SAMPLES: Sample[] = [
  // === プラチナ（60分以内） ===
  {
    minutesAgo: 8,
    name: "（株）池袋フードサービス",
    postal: "171-0014",
    address1: "東京都豊島区池袋2-3-4",
    address2: "サンライズビル5F",
    phone: "03-3987-1234",
    major: "M飲食サービス業",
    middle: "76飲食店",
    small: "761食堂、レストラン",
    detail: "7611食堂、レストラン",
    result: "受注NG",
    memo: "代表対応 / 既存業者あり / 切替検討は半年後",
  },
  {
    minutesAgo: 18,
    name: "新宿アクア商事（株）",
    postal: "160-0023",
    address1: "東京都新宿区西新宿7-1-2",
    address2: "西新宿パークビル12F",
    phone: "03-3343-5678",
    major: "I情報通信業",
    middle: "39情報サービス業",
    small: "391ソフトウェア業",
    detail: "3911受託開発ソフトウェア業",
    result: "受注NG",
    memo: "CTO直電通った / 来月予算会議で再検討",
  },
  {
    minutesAgo: 27,
    name: "渋谷ベンチャー（合）",
    postal: "150-0002",
    address1: "東京都渋谷区渋谷3-4-5",
    address2: "ヒカリエタワー8F",
    phone: "03-3406-7890",
    major: "I情報通信業",
    middle: "40インターネット附随サービス業",
    small: "401インターネット附随サービス業",
    detail: "4011ポータルサイト・サーバ運営業",
    result: "受注NG",
    memo: "代表者 興味あり / 資料送付済み",
  },
  {
    minutesAgo: 42,
    name: "（有）港区メディカル",
    postal: "106-0032",
    address1: "東京都港区六本木4-5-6",
    address2: "",
    phone: "03-3478-2345",
    major: "P医療、福祉",
    middle: "83医療業",
    small: "831病院",
    detail: "8311一般病院",
    result: "受注NG",
    memo: "院長対応 / 予算は来年度",
  },
  {
    minutesAgo: 55,
    name: "千代田リーガル法律事務所",
    postal: "100-0005",
    address1: "東京都千代田区丸の内1-2-3",
    address2: "丸の内センタービル22F",
    phone: "03-3287-4567",
    major: "R学術研究、専門・技術サービス業",
    middle: "72専門サービス業",
    small: "722法律事務所",
    detail: "7221法律事務所",
    result: "受注NG",
    memo: "代表弁護士対応 / 検討意向あり",
  },

  // === エメラルド（60〜180分） ===
  {
    minutesAgo: 75,
    name: "（株）豊島ロジスティクス",
    postal: "171-0021",
    address1: "東京都豊島区西池袋3-4-5",
    address2: "",
    phone: "03-3984-8901",
    major: "H運輸業、郵便業",
    middle: "44道路貨物運送業",
    small: "441一般貨物自動車運送業",
    detail: "4411一般貨物自動車運送業",
    result: "受注NG",
    memo: "営業部長 不在 / 後日折り返し",
  },
  {
    minutesAgo: 95,
    name: "アクアプラン（有）",
    postal: "104-0061",
    address1: "東京都中央区銀座5-6-7",
    address2: "銀座ハイツ3F",
    phone: "03-3543-1122",
    major: "L学術研究、専門・技術サービス業",
    middle: "73広告業",
    small: "731広告業",
    detail: "7311広告業",
    result: "受注NG",
    memo: "クリエイティブ責任者 / 興味あり",
  },
  {
    minutesAgo: 115,
    name: "（合）城南パートナーズ",
    postal: "144-0052",
    address1: "東京都大田区蒲田5-6-7",
    address2: "",
    phone: "03-3733-3344",
    major: "K不動産業、物品賃貸業",
    middle: "68不動産取引業",
    small: "682不動産代理業・仲介業",
    detail: "6821建物売買業",
    result: "受注NG",
    memo: "代表者 / 予算は今期残り",
  },
  {
    minutesAgo: 140,
    name: "サンライズ工務店",
    postal: "211-0003",
    address1: "神奈川県川崎市中原区上丸子3-4-5",
    address2: "",
    phone: "044-722-5566",
    major: "D建設業",
    middle: "07職別工事業",
    small: "074木造建築工事業",
    detail: "0741木造建築工事業",
    result: "受注NG",
    memo: "現場監督経由で代表へ / 月末再電",
  },
  {
    minutesAgo: 168,
    name: "（株）光和管理",
    postal: "650-0024",
    address1: "兵庫県神戸市中央区海岸通5-6-7",
    address2: "",
    phone: "078-322-7788",
    major: "L学術研究、専門・技術サービス業",
    middle: "74技術サービス業",
    small: "741獣医業",
    detail: "7411獣医業",
    result: "受注NG",
    memo: "院長対応 / 来週まで猶予",
  },

  // === シルバー（3時間超） ===
  {
    minutesAgo: 240,
    name: "東都デザイン（有）",
    postal: "460-0008",
    address1: "愛知県名古屋市中区栄3-4-5",
    address2: "栄センタービル7F",
    phone: "052-241-9900",
    major: "L学術研究、専門・技術サービス業",
    middle: "72専門サービス業",
    small: "726デザイン業",
    detail: "7261デザイン業",
    result: "受注NG",
    memo: "代表 / 既存取引先で当面不要",
  },
  {
    minutesAgo: 360,
    name: "西日本サポート（株）",
    postal: "812-0011",
    address1: "福岡県福岡市博多区博多駅前3-4-5",
    address2: "",
    phone: "092-411-2233",
    major: "K不動産業、物品賃貸業",
    middle: "68不動産取引業",
    small: "681建物売買業",
    detail: "6811建物売買業",
    result: "受注NG",
    memo: "本社不在 / 来週月曜折り返し依頼",
  },
  {
    minutesAgo: 480,
    name: "ミライ設備（有）",
    postal: "060-0001",
    address1: "北海道札幌市中央区北一条西2-3-4",
    address2: "",
    phone: "011-271-4455",
    major: "D建設業",
    middle: "08設備工事業",
    small: "081電気工事業",
    detail: "0811一般電気工事業",
    result: "受注NG",
    memo: "現場代理人 / 興味なし",
  },
  {
    minutesAgo: 720,
    name: "（合）さくら食品",
    postal: "980-0021",
    address1: "宮城県仙台市青葉区中央4-5-6",
    address2: "",
    phone: "022-263-6677",
    major: "E製造業",
    middle: "09食料品製造業",
    small: "099その他の食料品製造業",
    detail: "0995冷凍調理食品製造業",
    result: "受注NG",
    memo: "工場長 / 予算なし",
  },
  {
    minutesAgo: 1440,
    name: "丸吉工房（株）",
    postal: "730-0011",
    address1: "広島県広島市中区基町4-5-6",
    address2: "",
    phone: "082-228-8899",
    major: "E製造業",
    middle: "29電気機械器具製造業",
    small: "294民生用電気機械器具製造業",
    detail: "2941民生用電気機械器具製造業",
    result: "受注NG",
    memo: "代表 / 他社利用中",
  },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmt(d: Date): string {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const now = new Date();

  const headers = [
    "顧客No",
    "コール日時",
    "名前",
    "カナ",
    "郵便番号",
    "住所１",
    "住所２",
    "電話番号",
    "業種大分類",
    "業種中分類",
    "業種小分類",
    "業種細分類",
    "電話番号ハイフンなし",
    "メモ",
    "結果",
  ];

  const rows = SAMPLES.map((s, i) => {
    const t = new Date(now.getTime() - s.minutesAgo * 60_000);
    return [
      i + 1,
      fmt(t),
      s.name,
      "",
      s.postal,
      s.address1,
      s.address2,
      s.phone,
      s.major,
      s.middle,
      s.small,
      s.detail,
      s.phone.replace(/-/g, ""),
      s.memo,
      s.result,
    ]
      .map(csvEscape)
      .join(",");
  });

  // UTF-8 BOM 付きにして Excel でも文字化けしないように
  const csv = "\ufeff" + headers.join(",") + "\n" + rows.join("\n") + "\n";

  const stamp =
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    "_" +
    pad(now.getHours()) +
    pad(now.getMinutes());

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sample_fresh_${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
