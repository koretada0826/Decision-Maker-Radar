// 管理画面用：売上サマリー（金額合計・件数）
// 注：このAPI 自体は認可なし（管理者しか叩かない前提）。
// 公開URL固定だが、漏れる情報は「全件売上合計と件数」のみ。本格運用時は管理者JWTを必須化。

import { NextResponse } from "next/server";
import { getRevenueSummary, supabaseReady } from "@/lib/purchases-server";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  if (!supabaseReady()) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured" },
      { status: 200 },
    );
  }
  const result = await getRevenueSummary();
  if (!result.ok) {
    console.error("[/api/admin/revenue] error:", result.reason);
    return NextResponse.json(
      { ok: false, reason: "server_error" },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    count: result.count,
    totalAmount: result.totalAmount,
  });
}
