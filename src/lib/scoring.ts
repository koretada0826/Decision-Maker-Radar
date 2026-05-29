import type {
  CallResult,
  CallTemperature,
  ComplaintRisk,
  ContactPersonType,
  Rank,
} from "./supabase/types";

// ============================================================
// MVPはコード定数。将来 scoring_rules テーブルから取得できるよう
// getScoringRules() 抽象化を用意する。
// ============================================================

export const DEFAULT_RULES = {
  person: {
    representative: 35,
    decision_maker: 30,
    manager: 15,
    staff: 5,
    unknown: 0,
  } as Record<ContactPersonType, number>,
  recency: {
    within_30m: 30,
    within_1h: 25,
    within_3h: 15,
    same_day: 5,
  },
  call_result: {
    busy: 15,
    send_material: 10,
    call_back_later: 20,
    strong_rejection: -80,
    complaint: -100,
    not_interested: 0,
    no_budget: 0,
    already_using: 0,
    other: 0,
  } as Record<CallResult, number>,
  call_temperature: {
    hot: 25,
    warm: 15,
    neutral: 5,
    cold: 0,
    danger: -30,
  } as Record<CallTemperature, number>,
  complaint_risk: {
    low: 0,
    medium: -25,
    high: -80,
    blocked: -100,
  } as Record<ComplaintRisk, number>,
};

export type ScoringInput = {
  contact_time: string | Date;
  contact_person_type: ContactPersonType;
  call_result: CallResult;
  call_temperature: CallTemperature;
  complaint_risk: ComplaintRisk;
};

export function recencyBonus(contactTime: Date, now = new Date()): number {
  const minutes = (now.getTime() - contactTime.getTime()) / 60000;
  if (minutes <= 30) return DEFAULT_RULES.recency.within_30m;
  if (minutes <= 60) return DEFAULT_RULES.recency.within_1h;
  if (minutes <= 180) return DEFAULT_RULES.recency.within_3h;
  if (sameDay(contactTime, now)) return DEFAULT_RULES.recency.same_day;
  return 0;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function calculateScore(input: ScoringInput): { score: number; rank: Rank } {
  const ct = typeof input.contact_time === "string" ? new Date(input.contact_time) : input.contact_time;
  const raw =
    DEFAULT_RULES.person[input.contact_person_type] +
    recencyBonus(ct) +
    DEFAULT_RULES.call_result[input.call_result] +
    DEFAULT_RULES.call_temperature[input.call_temperature] +
    DEFAULT_RULES.complaint_risk[input.complaint_risk];

  const score = Math.max(0, Math.min(100, raw));
  const rank: Rank =
    score >= 80 ? "S" : score >= 60 ? "A" : score >= 40 ? "B" : score >= 20 ? "C" : "D";
  return { score, rank };
}

// 表示前ハードカット
export function isHardCut(input: {
  call_result: CallResult;
  complaint_risk: ComplaintRisk;
  visit_allowed: boolean;
}): boolean {
  if (!input.visit_allowed) return true;
  if (input.complaint_risk === "blocked") return true;
  if (input.call_result === "complaint" || input.call_result === "strong_rejection") return true;
  return false;
}
