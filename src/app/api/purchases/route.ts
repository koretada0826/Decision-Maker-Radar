// メアドに紐づく購入リードを返すAPI
// クライアントから「自分のメアドに紐づく購入を取得」するために使う
// 注意：誰でも他人のメアドを入れて閲覧できる仕様（MVP）。
// 本格運用時は OTP / Magic Link 認証を追加する。

import { NextResponse } from "next/server";
import {
  listPurchasesByEmail,
  deletePurchase,
  deleteAllPurchasesByEmail,
  supabaseReady,
} from "@/lib/purchases-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  if (!supabaseReady()) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured", purchases: [] },
      { status: 200 },
    );
  }

  const result = await listPurchasesByEmail(email);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason, purchases: [] },
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
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    persisted: true,
    deleted: result.deleted,
  });
}
