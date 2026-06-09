import { NextResponse } from "next/server";
import Stripe from "stripe";
import { findPlan } from "@/lib/plans";
import { LEAD_PRICE_JPY } from "@/lib/purchases";
import {
  HOTNESS_PRICE,
  computeHotness,
  priceFor,
  type HotnessRank,
} from "@/lib/hotness";
import {
  hasAlreadyPurchased,
  supabaseReady,
} from "@/lib/purchases-server";
import { getLeadById } from "@/lib/leads-server";

function stripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key || key.includes("placeholder")) return false;
  // 本番ビルドではテストキーを許可しない（顧客がカード入力するのに実決済が走らない事故を防止）
  if (process.env.NODE_ENV === "production" && !key.startsWith("sk_live_")) {
    return false;
  }
  return true;
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

function resolvePrice(
  hotness: HotnessRank,
  isRepurchase: boolean,
): { price: number; label: string } {
  const price = priceFor(hotness, isRepurchase);
  const label =
    hotness === "platinum"
      ? "プラチナ"
      : hotness === "emerald"
        ? "エメラルド"
        : "シルバー";
  return { price, label: `${label}${isRepurchase ? "（更新版 半額）" : ""}` };
}

export async function POST(req: Request) {
  let body: {
    planId?: string;
    leadId?: string;
    leadName?: string;
    hotness?: HotnessRank;
    isRepurchase?: boolean;
    dedupKey?: string;
    email?: string;
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

    // === セキュリティ：価格はサーバーで再計算する ===
    // フロント送信の contact_time は信用しない。leads テーブルから真の値を引く。
    // - Supabase 未設定（dev環境のみ） → クライアント値を使用
    // - Supabase 設定済みで lookup 成功 → サーバー値を使用
    // - Supabase 設定済みで lookup 失敗 → 安全側に倒してシルバー扱い（クライアント値を信用しない）
    let trueContactTime: string | null = null;
    let supabaseLookupAttempted = false;
    if (supabaseReady()) {
      supabaseLookupAttempted = true;
      const leadResult = await getLeadById(body.leadId);
      if (leadResult.ok && leadResult.lead) {
        trueContactTime = leadResult.lead.contact_time;
      }
    }
    const contactTime = supabaseLookupAttempted
      ? trueContactTime // 本番：サーバー値のみ。null ならシルバー固定
      : (body.leadSnapshot?.contact_time ?? null); // dev：クライアント値を許容
    const serverHotness: HotnessRank = contactTime
      ? computeHotness(contactTime)
      : "silver";

    let serverIsRepurchase = false;
    const buyerEmail = (body.email ?? "").trim().toLowerCase();
    const dedupKey = (body.dedupKey ?? "").trim();
    if (buyerEmail && dedupKey && supabaseReady()) {
      const r = await hasAlreadyPurchased({ email: buyerEmail, dedupKey });
      if (r.ok && r.alreadyPurchased) {
        serverIsRepurchase = true;
      }
    }

    const { price, label } = resolvePrice(serverHotness, serverIsRepurchase);
    lineItem = {
      price_data: {
        currency: "jpy",
        product_data: {
          name: `リード購入（${label}）: ${name}`,
          description: "代表者・決裁者に到達した法人の詳細情報",
        },
        unit_amount: price,
      },
      quantity: 1,
    };
    successUrl = `${origin}/success?leadId=${encodeURIComponent(body.leadId)}&session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${origin}/search`;
    metadata = {
      lead_id: body.leadId,
      lead_name: name,
      lead_hotness: serverHotness,
      lead_dedup_key: dedupKey.slice(0, 500),
      lead_is_repurchase: serverIsRepurchase ? "1" : "0",
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

  // Stripe 未設定ならデモモード。ただし本番ビルドでは絶対に許可しない。
  if (!stripeConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "決済システムが未設定です。サイト管理者にお問い合わせください。",
        },
        { status: 503 },
      );
    }
    const params = body.leadId
      ? `leadId=${encodeURIComponent(body.leadId)}&demo=1`
      : `plan=${body.planId}&demo=1`;
    return NextResponse.json({ url: `${origin}/success?${params}` });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const buyerEmailForPrefill = (body.email ?? "").trim().toLowerCase();
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
      // 保存済みメアドがあれば Stripe Checkout に自動入力（再入力ミス防止）
      ...(buyerEmailForPrefill ? { customer_email: buyerEmailForPrefill } : {}),
      metadata,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      {
        error:
          "決済画面の準備に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 502 },
    );
  }
}
