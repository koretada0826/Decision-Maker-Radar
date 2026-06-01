import type {
  CallResult,
  ContactPersonType,
  Rank,
} from "./supabase/types";

// リスト1件分のフラットなデータ型
export type Lead = {
  id: string;
  dedup_key: string;
  company_name: string;
  address: string;
  ward: string;
  industry: string | null;
  size: string | null; // 規模感（任意：CSVに「規模」「従業員数」列があれば入る）
  phone: string | null;
  rank: Rank;
  score: number;
  contact_time: string;
  contact_person_type: ContactPersonType;
  call_result: CallResult;
  memo: string | null;
  source: "demo" | "csv";
};
