import { NextResponse } from "next/server";
import Stripe from "stripe";
import { findPlan } from "@/lib/plans";
import { LEAD_PRICE_JPY } from "@/lib/purchases";

function stripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return !!key && !key.includes("placeholder");
}

type LeadSnapshotBody = {
  company_name?: string;
  address?: string;
  ward?: string;
  industry?: string;
  phone?: string;
  memo?: string;
  rank?: string;
  score?: number;
  contact_time?: string;
  contact_person_type?: string;
  call_result?: string;
};

function snapshotToMetadata(s?: LeadSnapshotBody): Record<string, string> {
  if (!s) return {};
  const clip = (v?: string | number | null) => {
    if (v == null) return "";
    return String(v).slice(0, 500);
  };
  return {
    lead_company_name: clip(s.company_name),
    lead_address: clip(s.address),
    lead_ward: clip(s.ward),
    lead_industry: clip(s.industry),
    lead_phone: clip(s.phone),
    lead_memo: clip(s.memo),
    lead_rank: clip(s.rank),
    lead_score: clip(s.score),
    lead_contact_time: clip(s.contact_time),
    lead_contact_person_type: clip(s.contact_person_type),
    lead_call_result: clip(s.call_result),
  };
}

export async function POST(req: Request) {
  let body: {
    planId?: string;
    leadId?: string;
    leadName?: string;
    leadSnapshot?: LeadSnapshotBody;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエスト不正" }, { status: 400 });
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;
  let successUrl: string;
  let cancelUrl: string;
  let metadata: Record<string, string> = {};

  if (body.leadId) {
    const name = body.leadName?.trim() || "リード";
    lineItem = {
      price_data: {
        currency: "jpy",
        product_data: {
          name: `リード購入: ${name}`,
          description: "代表者・決裁者に到達した法人の詳細情報",
        },
        unit_amount: LEAD_PRICE_JPY,
      },
      quantity: 1,
    };
    successUrl = `${origin}/success?leadId=${encodeURIComponent(body.leadId)}&session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${origin}/search`;
    metadata = {
      lead_id: body.leadId,
      lead_name: name,
      ...snapshotToMetadata(body.leadSnapshot),
    };
  } else if (body.planId) {
    const plan = findPlan(body.planId);
    if (!plan) {
      return NextResponse.json(
        { error: "プランが見つかりません" },
        { status: 400 },
      );
    }
    lineItem = {
      price_data: {
        currency: "jpy",
        product_data: {
          name: `決裁者レーダー: ${plan.name}（${plan.leads}件）`,
          description: plan.description,
        },
        unit_amount: plan.price,
      },
      quantity: 1,
    };
    successUrl = `${origin}/success?plan=${plan.id}&session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${origin}/buy?canceled=1`;
    metadata = { plan_id: plan.id, leads: String(plan.leads) };
  } else {
    return NextResponse.json(
      { error: "leadId か planId が必要です" },
      { status: 400 },
    );
  }

  // Stripe 未設定ならデモモード
  if (!stripeConfigured()) {
    const params = body.leadId
      ? `leadId=${encodeURIComponent(body.leadId)}&demo=1`
      : `plan=${body.planId}&demo=1`;
    return NextResponse.json({ url: `${origin}/success?${params}` });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [lineItem],
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: "ja",
    customer_creation: "if_required",
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    metadata,
  });

  return NextResponse.json({ url: session.url });
}
