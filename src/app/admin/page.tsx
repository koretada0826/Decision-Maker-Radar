"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  Upload,
  Trash2,
  RotateCcw,
  X as XIcon,
} from "lucide-react";
import { CsvUploadDialog } from "@/app/search/CsvUploadDialog";
import {
  getPurchasedIds,
  setPurchasedIds,
  removePurchasedId,
  getStoredEmail,
  LEAD_PRICE_JPY,
} from "@/lib/purchases";
import type { Lead } from "@/lib/types";

const STORAGE_KEY = "kr-uploaded-leads-v2";

export default function AdminPage() {
  const [uploaded, setUploaded] = useState<Lead[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) setUploaded(parsed as Lead[]);
    } catch {}
    setPurchased(new Set(getPurchasedIds()));
  }, []);

  const purchasedLeads = useMemo(
    () => uploaded.filter((l) => purchased.has(l.id)),
    [uploaded, purchased],
  );
  const totalRevenue = purchasedLeads.length * LEAD_PRICE_JPY;

  function save(next: Lead[]) {
    // 同じ dedup_key は最新の1件だけ残す（同じCSV再取込時の重複行を排除）
    const seen = new Set<string>();
    const deduped: Lead[] = [];
    for (const l of next) {
      const key = l.dedup_key || l.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(l);
    }
    setUploaded(deduped);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
    } catch (e) {
      const msg = (e as Error)?.name === "QuotaExceededError"
        ? "ブラウザの保存容量を超えました。古い取込データを削除してください。"
        : "保存に失敗しました。";
      alert(msg);
    }
  }

  async function resetPurchases() {
    if (
      !confirm(
        `購入履歴 ${purchased.size} 件をリセットします。\nリストは未購入の状態に戻り、住所/電話/メモは再ロックされます。よろしいですか？`,
      )
    )
      return;
    setPurchasedIds([]);
    setPurchased(new Set());
    const email = getStoredEmail();
    if (email) {
      try {
        await fetch(`/api/purchases?email=${encodeURIComponent(email)}`, {
          method: "DELETE",
        });
      } catch {}
    }
  }

  async function removeSinglePurchase(lead: Lead) {
    if (!confirm(`「${lead.company_name}」を未購入に戻しますか？`)) return;
    removePurchasedId(lead.id);
    setPurchased((s) => {
      const next = new Set(s);
      next.delete(lead.id);
      return next;
    });
    const email = getStoredEmail();
    if (email) {
      try {
        await fetch(
          `/api/purchases?email=${encodeURIComponent(email)}&lead_id=${encodeURIComponent(lead.id)}`,
          { method: "DELETE" },
        );
      } catch {}
    }
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
        <div className="px-2 h-14 flex items-center gap-1">
          <Link
            href="/search"
            className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="戻る"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="font-bold">管理者ページ</div>
        </div>
      </header>

      <main className="px-3 py-4 space-y-3 max-w-3xl mx-auto">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <div>
            <strong>管理者専用ページ。</strong>
            営業マン画面（/search）にはこのページへのリンクは出ません。本番運用時はログインを必須化し、URLを知っていてもアクセスできない設計にします。
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">CSVインポート</h2>
            <p className="text-xs text-slate-500 mt-1">
              テレアポ済みの代表者・決裁者接触データを取り込みます。クレーム/強い拒否は自動除外。
            </p>
          </div>
          <div className="p-4 flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-slate-900 text-white font-bold active:bg-slate-800 active:scale-[0.98] transition-transform"
            >
              <Upload size={16} />
              CSVを取り込む
            </button>
            <a
              href="/api/sample-csv"
              download
              className="text-sm text-brand-700 underline"
              title="アクセスした時刻基準でプラチナ/エメラルド/シルバーが揃うサンプル"
            >
              動作確認用サンプルをDL（毎回新鮮）
            </a>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center">
            <h2 className="font-bold text-slate-900">取り込み済みデータ</h2>
            <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 rounded px-2 py-0.5">
              {uploaded.length} 件
            </span>
            {uploaded.length > 0 && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      `${uploaded.length} 件の取り込みデータを全て削除します。よろしいですか？`,
                    )
                  ) {
                    save([]);
                  }
                }}
                className="ml-auto inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold active:bg-red-100"
              >
                <Trash2 size={14} />
                全削除
              </button>
            )}
          </div>
          <div className="p-4">
            {uploaded.length === 0 ? (
              <p className="text-sm text-slate-500">
                取り込み済みデータはありません。CSVを取り込んでください。
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm max-h-80 overflow-y-auto">
                {uploaded.map((l) => (
                  <li
                    key={l.id}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{l.company_name}</span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {l.ward} · {l.industry ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center flex-wrap gap-2">
            <h2 className="font-bold text-slate-900">購入履歴</h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 rounded px-2 py-0.5">
              {purchased.size} 件
            </span>
            {purchased.size > 0 && (
              <span className="text-xs text-slate-600">
                売上 ¥{totalRevenue.toLocaleString()}
              </span>
            )}
            <button
              onClick={resetPurchases}
              disabled={purchased.size === 0}
              className="ml-auto inline-flex items-center gap-1 h-10 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold active:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} />
              全て未購入に戻す
            </button>
          </div>
          <div className="p-4">
            {purchased.size === 0 ? (
              <p className="text-sm text-slate-500">
                購入されたリードはまだありません。1件 ¥
                {LEAD_PRICE_JPY.toLocaleString()}{" "}
                でリストから「リスト購入」すると、住所・電話・メモが解放されます。
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto -mx-4">
                {purchasedLeads.map((l) => (
                  <li
                    key={l.id}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0">
                      解放
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {l.company_name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {l.ward} ・ {l.industry ?? "—"}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 shrink-0 tabular-nums">
                      ¥{LEAD_PRICE_JPY.toLocaleString()}
                    </div>
                    <button
                      onClick={() => removeSinglePurchase(l)}
                      className="shrink-0 inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-semibold hover:bg-red-50 active:bg-red-100"
                      aria-label={`${l.company_name} を未購入に戻す`}
                      title="このリードを未購入に戻す"
                    >
                      <XIcon size={12} />
                      解除
                    </button>
                  </li>
                ))}
                {purchasedLeads.length < purchased.size && (
                  <li className="px-4 py-3 text-xs text-slate-500 italic">
                    {purchased.size - purchasedLeads.length}{" "}
                    件は元データが見つかりません（取り込み済みデータから削除された可能性）
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">運用メモ（MVP）</h2>
          </div>
          <div className="p-4 text-xs text-slate-600 space-y-1">
            <p>
              ・現在は localStorage に保存されます。本番では Supabase にテナント別に保存します。
            </p>
            <p>
              ・本番化のとき、このページに Supabase Auth を入れて、管理者だけアクセスできるようにします。
            </p>
            <p>
              ・営業マンへの配布方法：管理者がリストを取り込み →
              チーム共有用URL（/search）を LINE/Slack で配布 → 営業マンはタップで即閲覧。
            </p>
          </div>
        </section>
      </main>

      {open && (
        <CsvUploadDialog
          onClose={() => setOpen(false)}
          onAdd={(newLeads) => save([...newLeads, ...uploaded])}
        />
      )}
    </div>
  );
}
