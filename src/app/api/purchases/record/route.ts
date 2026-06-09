// /success ページから呼ばれるバックアップ用エンドポイント
// Stripe Webhook が遅延 or 失敗した場合に備えて、フロントが直接記録する

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { upsertPurchase, supabaseReady } from "@/lib/purchases-server";

function safeParseInt(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエスト不正" }, { status: 400 });
  }

  const sessionId = body.session_id;
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { ok: false, reason: "stripe_not_configured" },
      { status: 200 },
    );
  }

  if (!supabaseReady()) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured" },
      { status: 200 },
    );
  }

  const stripe = new Stripe(stripeKey);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    console.error("[/api/purchases/record] session retrieve failed:", (e as Error).message);
    return NextResponse.json(
      { error: "決済情報の確認に失敗しました" },
      { status: 400 },
    );
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { ok: false, reason: "not_paid", status: session.payment_status },
      { status: 200 },
    );
  }

  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const email =
    session.customer_details?.email ?? session.customer_email ?? null;

  if (!email || !metadata.lead_id) {
    return NextResponse.json(
      { ok: false, reason: "missing_email_or_lead" },
      { status: 200 },
    );
  }

  const result = await upsertPurchase({
    email,
    leadId: metadata.lead_id,
    dedupKey: metadata.lead_dedup_key || undefined,
    snapshot: {
      company_name: metadata.lead_company_name ?? metadata.lead_name ?? "",
      address: metadata.lead_address || null,
      ward: metadata.lead_ward || null,
      industry: metadata.lead_industry || null,
      phone: metadata.lead_phone || null,
      memo: metadata.lead_memo || null,
      rank: metadata.lead_rank || null,
      score: safeParseInt(metadata.lead_score),
      contact_time: metadata.lead_contact_time || null,
      contact_person_type: metadata.lead_contact_person_type || null,
      call_result: metadata.lead_call_result || null,
    },
    stripeSessionId: session.id,
    stripePaymentIntent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
    // null フォールバックを 0 に（¥1000 デフォルトを廃止）
    amount: session.amount_total ?? 0,
    currency: session.currency ?? "jpy",
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email,
    lead_id: metadata.lead_id,
    dedup_key: metadata.lead_dedup_key || null,
  });
}
