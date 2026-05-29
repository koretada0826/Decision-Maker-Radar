import { NextResponse } from "next/server";
import Stripe from "stripe";
import { upsertPurchase } from "@/lib/purchases-server";

export const runtime = "nodejs";
// Webhookは raw body が必要なので Edge ではなく Node ランタイム
export const dynamic = "force-dynamic";

function metaToSnapshot(metadata: Record<string, string>) {
  return {
    company_name: metadata.lead_company_name ?? metadata.lead_name ?? "",
    address: metadata.lead_address || null,
    ward: metadata.lead_ward || null,
    industry: metadata.lead_industry || null,
    phone: metadata.lead_phone || null,
    memo: metadata.lead_memo || null,
    rank: metadata.lead_rank || null,
    score: metadata.lead_score ? parseInt(metadata.lead_score, 10) : null,
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
    return NextResponse.json(
      { error: `signature verification failed: ${(e as Error).message}` },
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
          snapshot: metaToSnapshot(metadata),
          stripeSessionId: session.id,
          stripePaymentIntent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          amount: session.amount_total ?? 1000,
          currency: session.currency ?? "jpy",
        });
        if (!result.ok) {
          console.error("[stripe webhook] upsert failed:", result.reason);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
