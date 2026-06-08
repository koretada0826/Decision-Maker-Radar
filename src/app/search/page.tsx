import type { Lead } from "@/lib/types";
import { SearchClient } from "./SearchClient";
import { listAllLeads, type LeadRow } from "@/lib/leads-server";

export const dynamic = "force-dynamic";

function rowToLead(r: LeadRow): Lead {
  return {
    id: r.id,
    dedup_key: r.dedup_key ?? "",
    company_name: r.company_name,
    address: r.address ?? "",
    ward: r.ward ?? "",
    industry: r.industry,
    size: r.size,
    phone: r.phone,
    rank: (r.rank ?? "D") as Lead["rank"],
    score: r.score ?? 0,
    contact_time: r.contact_time ?? new Date().toISOString(),
    contact_person_type:
      (r.contact_person_type ?? "decision_maker") as Lead["contact_person_type"],
    call_result: (r.call_result ?? "other") as Lead["call_result"],
    memo: r.memo,
    source: "csv",
  };
}

export default async function SearchPage() {
  // Supabase の leads テーブルから取得（管理者が /admin から取り込んだデータ）
  // Supabase 未設定なら空、その場合は localStorage のみで動作する。
  const result = await listAllLeads();
  const initial: Lead[] = result.ok ? result.leads.map(rowToLead) : [];
  return <SearchClient initial={initial} />;
}
