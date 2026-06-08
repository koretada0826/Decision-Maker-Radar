import type { Lead } from "@/lib/types";
import { SearchClient } from "./SearchClient";
import type { LeadRow } from "@/lib/leads-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

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

async function fetchLeadsFromServer(): Promise<Lead[]> {
  // 自分自身の /api/leads を叩く（SSR時にfetchすることでキャッシュ問題を回避）
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.RENDER_EXTERNAL_URL
      ? `https://${process.env.RENDER_EXTERNAL_URL.replace(/^https?:\/\//, "")}`
      : "");
  const url = base ? `${base}/api/leads` : "/api/leads";
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) {
      console.error("[search/page] fetch /api/leads failed:", res.status);
      return [];
    }
    const data = (await res.json()) as { ok: boolean; leads?: LeadRow[] };
    if (!data.ok || !data.leads) return [];
    return data.leads.map(rowToLead);
  } catch (e) {
    console.error("[search/page] fetch error:", (e as Error).message);
    return [];
  }
}

export default async function SearchPage() {
  // Supabase の leads テーブルから自APIエンドポイント経由で取得する
  // （Server Component から直接 supabase-js を使うとデプロイ環境で動かないケースがある）
  const initial = await fetchLeadsFromServer();
  return <SearchClient initial={initial} />;
}
