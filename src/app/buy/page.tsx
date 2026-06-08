"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { PLANS, type Plan } from "@/lib/plans";

export default function BuyPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function purchase(p: Plan) {
    setError(null);
    setLoadingId(p.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: p.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "決済セッションを作成できませんでした");
      }
      window.location.href = json.url;
    } catch (e) {
      setError((e as Error).message);
      setLoadingId(null);
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
        <div className="px-2 h-14 flex items-center gap-1">
          <Link
            href="/search"
            className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="戻る"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="font-bold flex items-center gap-1">
            <Sparkles size={16} />
            リストを購入
          </div>
        </div>
      </header>

      <main className="px-3 py-4 space-y-3 max-w-3xl mx-auto">
        <section className="text-center py-2">
          <h1 className="text-lg font-bold text-slate-900">
            代表者・決裁者に届いた法人リスト
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            無駄な飛び込みを減らし、決裁者直行ルートで効率最大化
          </p>
        </section>

        <ul className="space-y-3">
          {PLANS.map((p) => (
            <li
              key={p.id}
              className={`relative rounded-lg border-2 bg-white p-4 ${
                p.recommended ? "border-brand-700" : "border-slate-200"
              }`}
            >
              {p.recommended && (
                <span className="absolute -top-2 left-4 inline-block bg-slate-900 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  おすすめ
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <span className="text-xs text-slate-500">
                      {p.leads.toLocaleString()} 件
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-slate-900 leading-none">
                    ¥{p.price.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    （税込・1リードあたり ¥
                    {Math.round(p.price / p.leads).toLocaleString()}）
                  </div>
                </div>
              </div>

              <ul className="mt-3 space-y-1">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="text-xs text-slate-700 flex items-start gap-1.5"
                  >
                    <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => purchase(p)}
                disabled={loadingId !== null}
                className={`mt-4 w-full h-12 rounded-xl font-bold transition-colors ${
                  p.recommended
                    ? "bg-slate-900 text-white active:bg-slate-800"
                    : "bg-slate-900 text-white active:bg-slate-700"
                } disabled:opacity-60`}
              >
                {loadingId === p.id ? "決済画面を準備中…" : `${p.name} を購入する`}
              </button>
            </li>
          ))}
        </ul>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
            {error}
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center pt-2">
          決済は Stripe（SSL暗号化）で安全に処理されます。
          ご購入後すぐにリストが反映されます。
        </p>
      </main>
    </div>
  );
}
