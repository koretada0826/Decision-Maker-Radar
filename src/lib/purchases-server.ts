// サーバー側で Supabase に購入レコードを書き込むヘルパー
// 環境変数が未設定なら no-op で安全に終わらせる

import { createSupabaseServiceRole } from "@/lib/supabase/server";

export type LeadSnapshot = {
  company_name: string;
  address?: string | null;
  ward?: string | null;
  industry?: string | null;
  phone?: string | null;
  memo?: string | null;
  rank?: string | null;
  score?: number | null;
  contact_time?: string | null;
  contact_person_type?: string | null;
  call_result?: string | null;
};

export type PurchaseRow = LeadSnapshot & {
  id: string;
  email: string;
  lead_id: string;
  stripe_session_id?: string | null;
  stripe_payment_intent?: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

export function supabaseReady() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return !!url && !!key && !url.includes("placeholder") && !key.includes("placeholder");
}

export async function upsertPurchase(input: {
  email: string;
  leadId: string;
  snapshot: LeadSnapshot;
  stripeSessionId?: string;
  stripePaymentIntent?: string | null;
  amount: number;
  currency?: string;
}) {
  if (!supabaseReady()) {
    return { ok: false, reason: "supabase_not_configured" as const };
  }
  const supabase = createSupabaseServiceRole();
  const { error } = await supabase.from("purchases").upsert(
    {
      email: input.email,
      lead_id: input.leadId,
      company_name: input.snapshot.company_name ?? "",
      address: input.snapshot.address ?? null,
      ward: input.snapshot.ward ?? null,
      industry: input.snapshot.industry ?? null,
      phone: input.snapshot.phone ?? null,
      memo: input.snapshot.memo ?? null,
      rank: input.snapshot.rank ?? null,
      score: input.snapshot.score ?? null,
      contact_time: input.snapshot.contact_time ?? null,
      contact_person_type: input.snapshot.contact_person_type ?? null,
      call_result: input.snapshot.call_result ?? null,
      stripe_session_id: input.stripeSessionId ?? null,
      stripe_payment_intent: input.stripePaymentIntent ?? null,
      amount: input.amount,
      currency: input.currency ?? "jpy",
      status: "completed",
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: false },
  );
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function listPurchasesByEmail(email: string) {
  if (!supabaseReady()) {
    return { ok: false as const, reason: "supabase_not_configured" };
  }
  const supabase = createSupabaseServiceRole();
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const, purchases: (data ?? []) as PurchaseRow[] };
}
