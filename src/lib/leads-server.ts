// サーバー側で Supabase の leads テーブルにリードを書き込み・読み出すヘルパー

import { createSupabaseServiceRole } from "@/lib/supabase/server";
import { supabaseReady } from "@/lib/purchases-server";

export type LeadRow = {
  id: string;
  dedup_key: string | null;
  company_name: string;
  address: string | null;
  ward: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  memo: string | null;
  rank: string | null;
  score: number | null;
  contact_time: string | null;
  contact_person_type: string | null;
  call_result: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadInput = Omit<LeadRow, "created_at" | "updated_at">;

// 100件単位のバルク upsert で巨大CSVも処理可能に
export async function bulkUpsertLeads(
  leads: LeadInput[],
): Promise<{ ok: boolean; upserted: number; reason?: string }> {
  if (!supabaseReady()) {
    return { ok: false, upserted: 0, reason: "supabase_not_configured" };
  }
  if (leads.length === 0) return { ok: true, upserted: 0 };
  const supabase = createSupabaseServiceRole();
  // 100件ずつチャンク化
  const CHUNK = 100;
  let total = 0;
  for (let i = 0; i < leads.length; i += CHUNK) {
    const chunk = leads.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("leads")
      .upsert(
        chunk.map((l) => ({ ...l, updated_at: new Date().toISOString() })),
        { onConflict: "id" },
      );
    if (error) {
      return {
        ok: false,
        upserted: total,
        reason: error.message,
      };
    }
    total += chunk.length;
  }
  return { ok: true, upserted: total };
}

export async function listAllLeads(): Promise<{
  ok: boolean;
  leads: LeadRow[];
  reason?: string;
}> {
  if (!supabaseReady()) {
    return { ok: false, leads: [], reason: "supabase_not_configured" };
  }
  const supabase = createSupabaseServiceRole();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("contact_time", { ascending: false, nullsFirst: false })
    .limit(5000);
  if (error) return { ok: false, leads: [], reason: error.message };
  return { ok: true, leads: (data ?? []) as LeadRow[] };
}

// 単一リードを id で取得（サーバー側の真の contact_time を引くため）
export async function getLeadById(
  id: string,
): Promise<{ ok: boolean; lead?: LeadRow; reason?: string }> {
  if (!supabaseReady()) {
    return { ok: false, reason: "supabase_not_configured" };
  }
  const supabase = createSupabaseServiceRole();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, reason: error.message };
  if (!data) return { ok: false, reason: "not_found" };
  return { ok: true, lead: data as LeadRow };
}

export async function deleteAllLeads(): Promise<{
  ok: boolean;
  deleted: number;
  reason?: string;
}> {
  if (!supabaseReady()) {
    return { ok: false, deleted: 0, reason: "supabase_not_configured" };
  }
  const supabase = createSupabaseServiceRole();
  const { error, count } = await supabase
    .from("leads")
    .delete({ count: "exact" })
    .neq("id", "");
  if (error) return { ok: false, deleted: 0, reason: error.message };
  return { ok: true, deleted: count ?? 0 };
}
