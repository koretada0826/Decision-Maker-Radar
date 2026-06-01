"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";
import {
  addPurchasedId,
  addPurchasedDedupKey,
  setStoredEmail,
} from "@/lib/purchases";

export function SuccessClient({
  leadId,
  planName,
  planPrice,
  planLeads,
  isDemo,
  sessionId,
}: {
  leadId?: string;
  planName?: string;
  planPrice?: number;
  planLeads?: number;
  isDemo?: boolean;
  sessionId?: string;
}) {
  const [registered, setRegistered] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    // デモモードだけは URL の leadId をそのまま信用（決済は走ってないため）
    if (isDemo && leadId) {
      addPurchasedId(leadId);
      try {
        const raw = localStorage.getItem("kr-uploaded-leads-v2");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const lead = list.find(
              (l: { id?: string; dedup_key?: string }) => l?.id === leadId,
            );
            if (lead?.dedup_key) addPurchasedDedupKey(lead.dedup_key);
          }
        }
      } catch {}
      setRegistered(true);
      return;
    }

    // 本番：Stripe session を必ずサーバーで検証してから購入登録する。
    // URL の leadId は信用しない（改竄可能）。
    if (sessionId && !isDemo) {
      fetch("/api/purchases/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.email && data.lead_id) {
            // サーバーが返した lead_id だけを信用
            addPurchasedId(data.lead_id);
            if (data.dedup_key) addPurchasedDedupKey(data.dedup_key);
            setStoredEmail(data.email);
            setPersisted(true);
            setRegistered(true);
          } else {
            setPersisted(false);
          }
        })
        .catch(() => setPersisted(false));
    }
  }, [leadId, sessionId, isDemo]);

  const isSingleLead = !!leadId;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-4">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          ご購入ありがとうございます
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          {isSingleLead
            ? "リードの詳細情報を解放しました。"
            : "リストはまもなくご利用いただけます。"}
        </p>

        {isSingleLead && (
          <div className="mt-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-left">
            <div className="font-bold text-emerald-900">リード1件</div>
            <div className="text-xs text-emerald-800 mt-1">
              {registered
                ? "✓ 詳細（住所・電話・メモ）を解放しました"
                : "解放中…"}
            </div>
          </div>
        )}

        {planName && (
          <div className="mt-6 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left">
            <div className="flex items-baseline justify-between">
              <span className="font-bold text-slate-900">{planName}</span>
              <span className="text-lg font-bold">
                ¥{planPrice?.toLocaleString()}
              </span>
            </div>
            {planLeads && (
              <p className="text-xs text-slate-600 mt-1">
                リード {planLeads.toLocaleString()} 件
              </p>
            )}
          </div>
        )}

        {isDemo && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2 text-left">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong>デモモードでの表示です。</strong>
              <br />
              実際の決済は行われていません。本番では Stripe APIキー{" "}
              <code className="bg-amber-100 rounded px-1 mx-0.5">
                STRIPE_SECRET_KEY
              </code>{" "}
              を設定してください。
            </div>
          </div>
        )}

        {sessionId && (
          <p className="mt-2 text-[10px] text-slate-400">
            session_id: {sessionId}
          </p>
        )}

        <Link
          href="/search"
          className="mt-6 inline-flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-slate-900 text-white font-bold active:bg-slate-800 active:scale-[0.99] transition-transform"
        >
          リストに戻る
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
