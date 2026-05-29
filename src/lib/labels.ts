import type {
  CallResult,
  CallTemperature,
  ComplaintRisk,
  ContactPersonType,
  Rank,
  VisitResultCode,
} from "./supabase/types";

export const personLabel: Record<ContactPersonType, string> = {
  representative: "代表者",
  decision_maker: "決裁者",
  manager: "管理職",
  staff: "担当者",
  unknown: "不明",
};

export const callResultLabel: Record<CallResult, string> = {
  not_interested: "興味なし",
  busy: "多忙・後日",
  send_material: "資料送付",
  call_back_later: "再架電希望",
  no_budget: "予算なし",
  already_using: "他社利用中",
  strong_rejection: "強い拒否",
  complaint: "クレーム",
  other: "その他",
};

export const temperatureLabel: Record<CallTemperature, string> = {
  hot: "ホット",
  warm: "ウォーム",
  neutral: "ニュートラル",
  cold: "コールド",
  danger: "危険",
};

export const complaintRiskLabel: Record<ComplaintRisk, string> = {
  low: "低",
  medium: "中",
  high: "高",
  blocked: "禁止",
};

export const visitResultLabel: Record<VisitResultCode, string> = {
  absent: "不在",
  receptionist_ng: "受付NG",
  met_staff: "担当者接触",
  met_decision_maker: "決裁者接触",
  met_representative: "代表者接触",
  appointment_set: "アポ獲得",
  contract_likely: "受注見込",
  complaint: "クレーム",
  do_not_visit: "訪問禁止",
  other: "その他",
};

export const rankColor: Record<Rank, string> = {
  S: "bg-slate-900 text-white",
  A: "bg-slate-700 text-white",
  B: "bg-slate-500 text-white",
  C: "bg-slate-300 text-slate-900",
  D: "bg-slate-100 text-slate-700 border border-slate-300",
};
