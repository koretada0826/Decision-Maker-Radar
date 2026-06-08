// 重複購入チェック：このメアドが既にこの dedup_key を購入しているか
// 購入ボタンを押した直後、Stripe に飛ばす前にチェックする

import { NextResponse } from "next/server";
import { hasAlreadyPurchased, supabaseReady } from "@/lib/purchases-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ipOf(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

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

  // レート制限：1IP * 1メアドで 1分間30回まで
  const rl = checkRateLimit(`purchases:check:${ipOf(req)}:${email}`, 30);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited", alreadyPurchased: false },
      { status: 429 },
    );
  }

  if (!supabaseReady()) {
    return NextResponse.json({
      ok: true,
      alreadyPurchased: false,
      reason: "supabase_not_configured",
    });
  }

  const result = await hasAlreadyPurchased({ email, dedupKey });
  if (!result.ok) {
    console.error("[/api/purchases/check] error:", result.reason);
    return NextResponse.json(
      { ok: false, reason: "server_error" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    alreadyPurchased: result.alreadyPurchased,
    previousPurchase:
      "previousPurchase" in result ? result.previousPurchase : null,
  });
}
