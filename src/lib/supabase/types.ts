// 最小限の型定義（Supabase CLI の型生成が使えない環境向けに手書き）
export type Role = "owner" | "manager" | "rep" | "admin";

export type Rank = "S" | "A" | "B" | "C" | "D";

export type ContactPersonType =
  | "representative"
  | "decision_maker"
  | "manager"
  | "staff"
  | "unknown";

export type CallResult =
  | "not_interested"
  | "busy"
  | "send_material"
  | "call_back_later"
  | "no_budget"
  | "already_using"
  | "strong_rejection"
  | "complaint"
  | "other";

export type CallTemperature = "hot" | "warm" | "neutral" | "cold" | "danger";

export type ComplaintRisk = "low" | "medium" | "high" | "blocked";

export type VisitStatus = "visiting" | "visited" | "canceled";

export type VisitResultCode =
  | "absent"
  | "receptionist_ng"
  | "met_staff"
  | "met_decision_maker"
  | "met_representative"
  | "appointment_set"
  | "contract_likely"
  | "complaint"
  | "do_not_visit"
  | "other";

export type Company = {
  id: string;
  organization_id: string;
  company_name: string;
  address: string | null;
  prefecture: string | null;
  city: string | null;
  ward: string | null;
  nearest_station: string | null;
  industry: string | null;
  phone: string | null;
  website_url: string | null;
  source: string | null;
  external_id: string | null;
  dedupe_key: string;
  visit_allowed: boolean;
  latest_score: number;
  latest_rank: Rank;
  latest_signal_at: string | null;
  latest_signal_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CallSignal = {
  id: string;
  organization_id: string;
  company_id: string;
  contact_time: string;
  contact_person_type: ContactPersonType;
  call_result: CallResult;
  call_temperature: CallTemperature;
  complaint_risk: ComplaintRisk;
  memo: string | null;
  created_at: string;
};

export type Visit = {
  id: string;
  organization_id: string;
  company_id: string;
  rep_user_id: string;
  status: VisitStatus;
  started_at: string;
  completed_at: string | null;
};

export type VisitResult = {
  id: string;
  visit_id: string;
  organization_id: string;
  company_id: string;
  rep_user_id: string;
  result: VisitResultCode;
  memo: string | null;
  next_action: string | null;
  next_visit_date: string | null;
  appointment_at: string | null;
  created_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  status: "active" | "invited" | "disabled";
};

export type RoiSettings = {
  id: string;
  organization_id: string;
  rep_count: number;
  monthly_visits_per_rep: number;
  monthly_salary: number;
  fully_loaded_cost: number;
  baseline_appt_rate: number;
  service_appt_rate: number;
  close_rate: number;
  gross_profit_per_deal: number;
  saas_monthly_fee: number;
};
