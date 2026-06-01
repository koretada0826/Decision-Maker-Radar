// 重複購入チェック：このメアドが既にこの dedup_key を購入しているか
// 購入ボタンを押した直後、Stripe に飛ばす前にチェックする

import { NextResponse } from "next/server";
import { hasAlreadyPurchased, supabaseReady } from "@/lib/purchases-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const dedupKey = url.searchParams.get("dedup_key") ?? "";

  if (!email || !dedupKey) {
    return NextResponse.json({
      ok: true,
      alreadyPurchased: false,
      reason: "missing_params",
    });
  }

  if (!supabaseReady()) {
    // Supabase未設定なら重複チェック不可能なので通す
    return NextResponse.json({
      ok: true,
      alreadyPurchased: false,
      reason: "supabase_not_configured",
    });
  }

  const result = await hasAlreadyPurchased({ email, dedupKey });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    alreadyPurchased: result.alreadyPurchased,
    previousPurchase: "previousPurchase" in result ? result.previousPurchase : null,
  });
}
