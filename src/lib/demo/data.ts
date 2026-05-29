// =====================================================================
// デモ用の固定モックデータ。Supabase に繋がなくても地図にピンが立つ。
// 代表者・決裁者に到達したが、まだアポ獲得できていない法人だけを抽出。
// =====================================================================

import type {
  CallResult,
  CallTemperature,
  ComplaintRisk,
  ContactPersonType,
  Rank,
} from "@/lib/supabase/types";
import { calculateScore } from "@/lib/scoring";

export const DEMO_ORG = {
  id: "demo-org",
  name: "株式会社デモ営業",
};

type Signal = {
  contact_time: string;
  contact_person_type: ContactPersonType;
  call_result: CallResult;
  call_temperature: CallTemperature;
  complaint_risk: ComplaintRisk;
  memo: string;
};

export type DemoCompany = {
  id: string;
  company_name: string;
  address: string;
  ward: string;
  industry: string;
  phone: string;
  lat?: number;
  lng?: number;
  signal: Signal;
  score: number;
  rank: Rank;
};

const now = Date.now();
const min = (n: number) => new Date(now - n * 60_000).toISOString();
const hr = (n: number) => new Date(now - n * 60 * 60_000).toISOString();

function build(
  id: string,
  name: string,
  ward: string,
  industry: string,
  signal: Signal,
): DemoCompany {
  const { score, rank } = calculateScore(signal);
  return {
    id,
    company_name: name,
    address: `東京都${ward}サンプル町${id.split("-")[1]}-${id.split("-")[1]}`,
    ward,
    industry,
    phone: `03-1000-${id.split("-")[1].padStart(4, "0")}`,
    signal,
    score,
    rank,
  };
}

// 代表者または決裁者に到達した接触のみ（アポ未獲得）
export const DEMO_COMPANIES: DemoCompany[] = [
  build("c-01", "架空フーズ食堂", "新宿区", "飲食店", {
    contact_time: min(12),
    contact_person_type: "representative",
    call_result: "call_back_later",
    call_temperature: "hot",
    complaint_risk: "low",
    memo: "別日午後の来訪OK。社長が前向き。",
  }),
  build("c-02", "テスト美容室ルミナス", "渋谷区", "美容室", {
    contact_time: min(22),
    contact_person_type: "decision_maker",
    call_result: "send_material",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "資料送付希望。担当はオーナー。",
  }),
  build("c-04", "サンプル建設工業", "豊島区", "建設会社", {
    contact_time: min(48),
    contact_person_type: "representative",
    call_result: "busy",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "代表者直電通った。週内なら再訪可。",
  }),
  build("c-05", "テスト税理士事務所", "台東区", "士業事務所", {
    contact_time: min(58),
    contact_person_type: "decision_maker",
    call_result: "call_back_later",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "金曜午前希望。所長対応。",
  }),
  build("c-08", "テストショップ雑貨", "新宿区", "小売店", {
    contact_time: min(8),
    contact_person_type: "representative",
    call_result: "send_material",
    call_temperature: "hot",
    complaint_risk: "low",
    memo: "オーナー対応。資料受領前向き。",
  }),
  build("c-09", "架空テックラボ", "渋谷区", "IT企業", {
    contact_time: min(18),
    contact_person_type: "decision_maker",
    call_result: "call_back_later",
    call_temperature: "hot",
    complaint_risk: "low",
    memo: "CTO対応。検討前向き。",
  }),
  build("c-11", "架空居酒屋まんぷく", "豊島区", "飲食店", {
    contact_time: min(25),
    contact_person_type: "representative",
    call_result: "busy",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "営業中。夕方再訪可。",
  }),
  build("c-14", "サンプル住建", "千代田区", "建設会社", {
    contact_time: min(42),
    contact_person_type: "decision_maker",
    call_result: "busy",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "建築部長対応。",
  }),
  build("c-15", "架空司法書士事務所", "新宿区", "士業事務所", {
    contact_time: hr(3),
    contact_person_type: "representative",
    call_result: "send_material",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "代表司法書士対応。",
  }),
  build("c-18", "サンプル衣料品店", "豊島区", "小売店", {
    contact_time: hr(5),
    contact_person_type: "representative",
    call_result: "send_material",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "店主対応。資料送付済。",
  }),
  build("c-19", "架空ソフト開発", "台東区", "IT企業", {
    contact_time: min(28),
    contact_person_type: "decision_maker",
    call_result: "call_back_later",
    call_temperature: "hot",
    complaint_risk: "low",
    memo: "副社長対応。前向き。",
  }),
  build("c-21", "架空カフェドリーム", "千代田区", "飲食店", {
    contact_time: min(15),
    contact_person_type: "representative",
    call_result: "busy",
    call_temperature: "hot",
    complaint_risk: "low",
    memo: "オーナー対応中。再電要。",
  }),
  build("c-24", "テスト工務店", "港区", "建設会社", {
    contact_time: hr(2),
    contact_person_type: "decision_maker",
    call_result: "send_material",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "現場監督経由で代表へ。",
  }),
  build("c-25", "架空社会保険労務士", "豊島区", "士業事務所", {
    contact_time: hr(10),
    contact_person_type: "representative",
    call_result: "busy",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "事務所代表。",
  }),
  build("c-28", "テスト書店", "千代田区", "小売店", {
    contact_time: hr(11),
    contact_person_type: "representative",
    call_result: "busy",
    call_temperature: "warm",
    complaint_risk: "low",
    memo: "店主対応。",
  }),
];
