// メアドに紐づく購入リードを返すAPI。
// MVP 段階のため OTP 認証は未実装だが、最低限の防御として：
// - IP + email 単位のレート制限
// - エラーメッセージから内部情報をマスク
// - 削除系は同一エンドポイントを連打不可
// 本格運用時は OTP / Magic Link 認証へ置き換える。

import { NextResponse } from "next/server";
import {
  listPurchasesByEmail,
  deletePurchase,
  deleteAllPurchasesByEmail,
  supabaseReady,
} from "@/lib/purchases-server";
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
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // レート制限：1IP * 1メアドで 1分間20回まで
  const rl = checkRateLimit(`purchases:GET:${ipOf(req)}:${email}`);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited", purchases: [] },
      { status: 429 },
    );
  }

  if (!supabaseReady()) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured", purchases: [] },
      { status: 200 },
    );
  }

  const result = await listPurchasesByEmail(email);
  if (!result.ok) {
    // 内部 reason はサーバーログに留め、クライアントには generic を返す
    console.error("[/api/purchases GET] error:", result.reason);
    return NextResponse.json(
      { ok: false, reason: "server_error", purchases: [] },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    purchases: result.purchases,
  });
}

// 個別 or 一括の購入解除
// DELETE /api/purchases?email=X&lead_id=Y    → 1件削除
// DELETE /api/purchases?email=X              → そのメアドの全件削除
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const leadId = url.searchParams.get("lead_id") ?? "";
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // 削除系はより厳格に：1IP * 1メアドで 1分間5回まで
  const rl = checkRateLimit(`purchases:DELETE:${ipOf(req)}:${email}`, 5);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429 },
    );
  }

  if (!supabaseReady()) {
    return NextResponse.json(
      { ok: true, persisted: false, reason: "supabase_not_configured" },
      { status: 200 },
    );
  }
  const result = leadId
    ? await deletePurchase({ email, leadId })
    : await deleteAllPurchasesByEmail(email);
  if (!result.ok) {
    console.error("[/api/purchases DELETE] error:", result.reason);
    return NextResponse.json(
      { ok: false, reason: "server_error" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    persisted: true,
    deleted: result.deleted,
  });
}
