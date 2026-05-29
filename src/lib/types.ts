import type {
  CallResult,
  ContactPersonType,
  Rank,
} from "./supabase/types";

// リスト1件分のフラットなデータ型
export type Lead = {
  id: string;
  company_name: string;
  address: string;
  ward: string;
  industry: string | null;
  phone: string | null;
  rank: Rank;
  score: number;
  contact_time: string;
  contact_person_type: ContactPersonType;
  call_result: CallResult;
  memo: string | null;
  source: "demo" | "csv";
};
