import { NextResponse } from "next/server";
import Stripe from "stripe";
import { upsertPurchase } from "@/lib/purchases-server";

export const runtime = "nodejs";
// Webhookは raw body が必要なので Edge ではなく Node ランタイム
export const dynamic = "force-dynamic";

function safeParseInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function metaToSnapshot(metadata: Record<string, string>) {
  return {
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
  };
}

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "no signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    // 内部エラー詳細はサーバーログにのみ出し、クライアントには generic を返す
    console.error("[stripe webhook] signature verification failed:", (e as Error).message);
    return NextResponse.json(
      { error: "signature verification failed" },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const metadata = (session.metadata ?? {}) as Record<string, string>;
      const email =
        session.customer_details?.email ?? session.customer_email ?? null;

      if (email && metadata.lead_id) {
        const result = await upsertPurchase({
          email,
          leadId: metadata.lead_id,
          dedupKey: metadata.lead_dedup_key || undefined,
          snapshot: metaToSnapshot(metadata),
          stripeSessionId: session.id,
          stripePaymentIntent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          // null フォールバックを 0 に（¥1000 デフォルトを廃止：実額が取れないまま保存しない）
          amount: session.amount_total ?? 0,
          currency: session.currency ?? "jpy",
        });
        if (!result.ok) {
          // Stripe に Webhook を再送させる（DB 一時障害の自動回復）
          console.error("[stripe webhook] upsert failed:", result.reason);
          return NextResponse.json(
            { error: "persist_failed" },
            { status: 500 },
          );
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
