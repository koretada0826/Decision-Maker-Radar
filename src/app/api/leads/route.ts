// リード一覧の取得（GET）と一括 upsert（POST）。
// POST は管理者専用想定（簡易のため一旦認可ガード無し、本格運用時は管理者JWTで縛る）。
// GET は営業担当の閲覧用（中身は名前/区/業種など、購入前マスク済み情報のみ）。

import { NextResponse } from "next/server";
import {
  bulkUpsertLeads,
  listAllLeads,
  deleteAllLeads,
  type LeadInput,
} from "@/lib/leads-server";
import { supabaseReady } from "@/lib/purchases-server";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseReady()) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured", leads: [] },
      { status: 200 },
    );
  }
  const result = await listAllLeads();
  if (!result.ok) {
    console.error("[/api/leads GET] error:", result.reason);
    return NextResponse.json(
      { ok: false, reason: "server_error", leads: [] },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, leads: result.leads });
}

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  if (!supabaseReady()) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured" },
      { status: 200 },
    );
  }
  let body: { leads?: LeadInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!Array.isArray(body.leads)) {
    return NextResponse.json({ error: "leads array required" }, { status: 400 });
  }
  const result = await bulkUpsertLeads(body.leads);
  if (!result.ok) {
    console.error("[/api/leads POST] error:", result.reason);
    return NextResponse.json(
      { ok: false, upserted: result.upserted, reason: "server_error" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, upserted: result.upserted });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  if (!supabaseReady()) {
    return NextResponse.json(
      { ok: false, reason: "supabase_not_configured" },
      { status: 200 },
    );
  }
  const result = await deleteAllLeads();
  if (!result.ok) {
    console.error("[/api/leads DELETE] error:", result.reason);
    return NextResponse.json(
      { ok: false, reason: "server_error" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, deleted: result.deleted });
}
