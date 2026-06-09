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
  Clock,
  CheckCircle2,
} from "lucide-react";
import { CsvUploadDialog } from "@/app/search/CsvUploadDialog";
import { AdminAuthGate } from "@/components/AdminAuthGate";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  getPurchasedIds,
  setPurchasedIds,
  removePurchasedId,
  getStoredEmail,
  LEAD_PRICE_JPY,
} from "@/lib/purchases";
import type { Lead } from "@/lib/types";

const LAST_IMPORT_KEY = "kr-last-import-v1";
const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_API_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "";
const adminHeaders: HeadersInit = ADMIN_API_TOKEN
  ? { Authorization: `Bearer ${ADMIN_API_TOKEN}` }
  : {};

const STORAGE_KEY = "kr-uploaded-leads-v2";

export default function AdminPage() {
  return (
    <AdminAuthGate>
      <AdminPageInner />
    </AdminAuthGate>
  );
}

function AdminPageInner() {
  const toast = useToast();
  const [uploaded, setUploaded] = useState<Lead[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [lastImport, setLastImport] = useState<number | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmResetPurchases, setConfirmResetPurchases] = useState(false);
  const [confirmRemoveOne, setConfirmRemoveOne] = useState<Lead | null>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [serverRevenue, setServerRevenue] = useState<{
    count: number;
    totalAmount: number;
  } | null>(null);
  const [serverLeadsCount, setServerLeadsCount] = useState<number | null>(null);
  const [resyncing, setResyncing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed))
        setUploaded(
          parsed.filter(
            (x): x is Lead =>
              x != null &&
              typeof x === "object" &&
              typeof x.id === "string" &&
              typeof x.company_name === "string",
          ),
        );
    } catch {}
    setPurchased(new Set(getPurchasedIds()));
    try {
      const ts = localStorage.getItem(LAST_IMPORT_KEY);
      if (ts) setLastImport(parseInt(ts, 10) || null);
    } catch {}
    // サーバーから実額売上を取得
    fetch("/api/admin/revenue", { headers: adminHeaders })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setServerRevenue({ count: data.count, totalAmount: data.totalAmount });
        }
      })
      .catch(() => {});
    // サーバー側のリード件数を取得して、ローカルとの mismatch を検知
    // /api/leads GET は public（営業担当も叩く）なので token は不要
    fetch("/api/leads")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.leads)) {
          setServerLeadsCount(data.leads.length);
        }
      })
      .catch(() => {});
  }, []);

  // ローカルとサーバーの件数 mismatch を検知したら自動同期
  // （uploaded が localStorage から復元された後にチェック）
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    if (serverLeadsCount === null) return;
    if (uploaded.length === 0) return;
    if (serverLeadsCount === uploaded.length) return;
    // 自動同期発火条件：ローカルに件数あり、サーバーと不一致
    console.log(
      `[admin] auto-syncing ${uploaded.length} leads to server (server has ${serverLeadsCount})`,
    );
    resyncToServer();
    // resyncToServer は state を更新するので deps から除外（一度だけ走らせる）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverLeadsCount, uploaded.length]);

  // ローカルに保存されているデータをサーバーに再送信する
  async function resyncToServer() {
    if (resyncing) return;
    setResyncing(true);
    // 旧バージョンの壊れた id を修復（Japanese strip による衝突を解消）
    function djb2Hash(s: string): string {
      let h = 5381;
      for (let j = 0; j < s.length; j++) {
        h = ((h << 5) + h + s.charCodeAt(j)) >>> 0;
      }
      return h.toString(36);
    }
    function repairId(l: Lead, idx: number): string {
      // 旧IDが「lead-|XXX」みたいに本体が剥がされている場合は再生成
      const looksBroken =
        l.id.startsWith("lead-|") || l.id.length < 8 || l.id === "lead-";
      if (!looksBroken) return l.id;
      const key = l.dedup_key || l.company_name;
      return `lead-${djb2Hash(key)}-${djb2Hash(l.company_name + idx)}`;
    }
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({
          leads: uploaded.map((l, idx) => ({
            id: repairId(l, idx),
            dedup_key: l.dedup_key ?? null,
            company_name: l.company_name,
            address: l.address ?? null,
            ward: l.ward ?? null,
            industry: l.industry ?? null,
            size: l.size ?? null,
            phone: l.phone ?? null,
            memo: l.memo ?? null,
            rank: l.rank ?? null,
            score: l.score ?? null,
            contact_time: l.contact_time ?? null,
            contact_person_type: l.contact_person_type ?? null,
            call_result: l.call_result ?? null,
          })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.show(
          `${data.upserted} 件をサーバーに同期しました`,
          "success",
        );
        setServerLeadsCount(data.upserted);
      } else {
        toast.show("サーバー同期に失敗しました", "error");
      }
    } catch {
      toast.show("通信エラーで同期できませんでした", "error");
    } finally {
      setResyncing(false);
    }
  }

  const purchasedLeads = useMemo(
    () => uploaded.filter((l) => purchased.has(l.id)),
    [uploaded, purchased],
  );
  // サーバー集計があればそちらを優先（実額）、なければローカル件数 × ¥1000 でフォールバック
  const totalRevenue = serverRevenue
    ? serverRevenue.totalAmount
    : purchasedLeads.length * LEAD_PRICE_JPY;
  const revenueCount = serverRevenue ? serverRevenue.count : purchased.size;

  async function save(next: Lead[]) {
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
      const now = Date.now();
      localStorage.setItem(LAST_IMPORT_KEY, String(now));
      setLastImport(now);
    } catch (e) {
      const msg = (e as Error)?.name === "QuotaExceededError"
        ? "ブラウザの保存容量を超えました。古い取り込みデータを削除してください。"
        : "保存に失敗しました。時間をおいて再度お試しください。";
      toast.show(msg, "error");
    }

    // サーバーにも upsert（営業担当の端末から見えるように）
    if (SUPABASE_CONFIGURED) {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...adminHeaders },
          body: JSON.stringify({
            leads: deduped.map((l) => ({
              id: l.id,
              dedup_key: l.dedup_key ?? null,
              company_name: l.company_name,
              address: l.address ?? null,
              ward: l.ward ?? null,
              industry: l.industry ?? null,
              size: l.size ?? null,
              phone: l.phone ?? null,
              memo: l.memo ?? null,
              rank: l.rank ?? null,
              score: l.score ?? null,
              contact_time: l.contact_time ?? null,
              contact_person_type: l.contact_person_type ?? null,
              call_result: l.call_result ?? null,
            })),
          }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.show(
            `${data.upserted} 件をサーバーに保存しました（全端末で共有）`,
            "success",
          );
        } else {
          toast.show("サーバー保存に失敗しました（ローカルには保存済み）", "error");
        }
      } catch {
        toast.show("サーバー保存に失敗しました（ローカルには保存済み）", "error");
      }
    }
  }

  async function resetPurchasesImpl() {
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
    toast.show("購入履歴をリセットしました", "success");
  }

  async function removeSinglePurchaseImpl(lead: Lead, targetEmail?: string) {
    removePurchasedId(lead.id);
    setPurchased((s) => {
      const next = new Set(s);
      next.delete(lead.id);
      return next;
    });
    // 営業担当のメアドを指定して、その人の購入履歴だけ削除する
    // 引数で渡されたら優先、無ければ管理者の保存メアド（後方互換）
    const email = targetEmail || getStoredEmail();
    if (email) {
      try {
        await fetch(
          `/api/purchases?email=${encodeURIComponent(email)}&lead_id=${encodeURIComponent(lead.id)}`,
          { method: "DELETE" },
        );
      } catch {}
    }
    toast.show(`「${lead.company_name}」を未購入に戻しました`, "success");
  }

  return (
    <div className="min-h-dvh pb-12">
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
        {/* ローカルとサーバーの件数mismatch警告 */}
        {SUPABASE_CONFIGURED &&
          serverLeadsCount !== null &&
          uploaded.length > 0 &&
          serverLeadsCount !== uploaded.length && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex flex-col gap-2 sm:flex-row sm:items-center">
              <ShieldAlert
                size={16}
                className="shrink-0 mt-0.5 text-amber-700"
                aria-hidden="true"
              />
              <div className="flex-1">
                <strong>サーバーに未同期のデータがあります</strong>
                <br />
                このブラウザ: {uploaded.length}件 / サーバー: {serverLeadsCount}件
                <br />
                <span className="text-[11px] text-amber-700">
                  サーバーに同期しないと営業担当のスマホには表示されません。
                </span>
              </div>
              <button
                type="button"
                onClick={resyncToServer}
                disabled={resyncing}
                className="shrink-0 inline-flex items-center justify-center h-11 px-4 rounded-lg bg-amber-600 text-white font-bold text-sm active:bg-amber-700 disabled:opacity-50"
              >
                {resyncing ? "同期中…" : "サーバーに同期する"}
              </button>
            </div>
          )}

        {!SUPABASE_CONFIGURED && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 flex gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-700" />
            <div>
              <strong>このブラウザにだけ保存されます</strong>
              <br />
              データベースが未接続のため、取り込んだCSV・購入履歴は
              <strong>このブラウザの中だけ</strong>に残ります。
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>他の端末（営業担当のスマホ）には共有されません</li>
                <li>キャッシュを消すとデータも消えます</li>
              </ul>
            </div>
          </div>
        )}

        {SUPABASE_CONFIGURED && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-700" aria-hidden="true" />
            <div>
              <strong>データベース接続済み。</strong>
              購入履歴は端末を越えて共有されます。
            </div>
          </div>
        )}

        {lastImport && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 flex items-center gap-2">
            <Clock size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
            <span className="tabular-nums">
              最終取り込み: {formatRelativeTime(lastImport)}
            </span>
          </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <div>
            <strong>管理者専用ページ。</strong>
            URL（/admin）を直接開いてアクセスします。営業担当画面には導線がありません。
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">CSVインポート</h2>
            <p className="text-xs text-slate-500 mt-1">
              テレアポで代表者や決裁者に当たれた顧客データを取り込みます。クレーム・強い拒否は自動で除外されます。
            </p>
          </div>
          <div className="p-4 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-slate-900 text-white font-bold active:bg-slate-800 active:scale-[0.98] transition-transform"
            >
              <Upload size={16} aria-hidden="true" />
              CSVを取り込む
            </button>
            <a
              href="/api/sample-csv"
              download
              className="text-sm text-slate-700 underline"
              title="アクセス時の時刻基準で3ランクが揃うサンプル"
            >
              サンプルCSVをダウンロード（毎回最新の時刻で生成）
            </a>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center">
            <h2 className="font-bold text-slate-900">取り込み済みデータ</h2>
            <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 rounded px-2 py-0.5 tabular-nums">
              {uploaded.length} 件
            </span>
            {uploaded.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(true)}
                className="ml-auto inline-flex items-center gap-1.5 h-11 px-3 rounded-lg bg-red-700 text-white text-sm font-bold active:bg-red-800 shadow-sm"
                title="CSVデータを全部消す（営業担当画面からも消える）"
              >
                <Trash2 size={14} aria-hidden="true" />
                CSVデータ全削除
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
            <span className="text-xs bg-emerald-100 text-emerald-800 rounded px-2 py-0.5 tabular-nums">
              {revenueCount} 件
            </span>
            {revenueCount > 0 && (
              <span className="text-xs text-slate-600 tabular-nums">
                売上 ¥{totalRevenue.toLocaleString()}
                {serverRevenue && (
                  <span className="ml-1 text-emerald-700">（実額）</span>
                )}
              </span>
            )}
            <button
              type="button"
              onClick={() => setConfirmResetPurchases(true)}
              disabled={purchased.size === 0}
              className="ml-auto inline-flex items-center gap-1.5 h-11 px-3 rounded-lg border-2 border-amber-500 bg-amber-50 text-amber-900 text-sm font-bold active:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="購入履歴を全部消す（CSVデータは消えない）"
            >
              <RotateCcw size={14} aria-hidden="true" />
              購入履歴を全リセット
            </button>
          </div>
          <div className="p-4">
            {purchased.size === 0 ? (
              <p className="text-sm text-slate-500">
                まだ購入されたリードはありません。営業担当が1件 ¥
                {LEAD_PRICE_JPY.toLocaleString()}〜 で詳細を解放できます。
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
                      type="button"
                      onClick={() => setConfirmRemoveOne(l)}
                      className="shrink-0 inline-flex items-center gap-1 h-11 px-3 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-semibold hover:bg-red-50 active:bg-red-100"
                      aria-label={`${l.company_name} を未購入に戻す`}
                      title="このリードを未購入に戻す"
                    >
                      <XIcon size={14} aria-hidden="true" />
                      解除
                    </button>
                  </li>
                ))}
                {purchasedLeads.length < purchased.size && (
                  <li className="px-4 py-3 text-xs text-slate-500 italic tabular-nums">
                    {purchased.size - purchasedLeads.length}{" "}
                    件は元データが見つかりません（CSVデータから削除されています）
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">運用メモ</h2>
          </div>
          <div className="p-4 text-xs text-slate-600 space-y-1">
            <p>
              ・営業担当への配布：取り込み後、共有URL（/search）をLINEで送る → タップで即閲覧。
            </p>
            <p>
              ・CSV運用：毎日同じ時間帯に取り込むと営業担当が「いつ最新版が来るか」を覚えやすい。
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

      <ConfirmDialog
        open={confirmDeleteAll}
        title="取り込みデータをすべて削除"
        description={`${uploaded.length} 件のCSVデータを削除します。\n営業担当のリストからも消えます。`}
        confirmLabel="削除する"
        cancelLabel="やめる"
        tone="danger"
        onConfirm={async () => {
          await save([]);
          if (SUPABASE_CONFIGURED) {
            try {
              await fetch("/api/leads", { method: "DELETE", headers: adminHeaders });
            } catch {}
          }
          setConfirmDeleteAll(false);
          toast.show("取り込みデータをすべて削除しました", "success");
        }}
        onCancel={() => setConfirmDeleteAll(false)}
      />

      <ConfirmDialog
        open={confirmResetPurchases}
        title="購入履歴をリセット"
        description={`購入履歴 ${purchased.size} 件を全削除します。\n詳細（住所・電話）は再ロックされます。`}
        confirmLabel="リセットする"
        cancelLabel="やめる"
        tone="danger"
        onConfirm={() => {
          resetPurchasesImpl();
          setConfirmResetPurchases(false);
        }}
        onCancel={() => setConfirmResetPurchases(false)}
      />

      {confirmRemoveOne && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[4000] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmRemoveOne(null);
              setTargetEmail("");
            }
          }}
        >
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h2 className="font-bold text-slate-900 text-lg">
              「{confirmRemoveOne.company_name}」を未購入に戻す
            </h2>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                対象の営業担当メアド
              </label>
              <input
                type="email"
                inputMode="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="sales@example.com"
                className="w-full h-12 px-3 rounded-xl border border-slate-300 text-base bg-white focus:outline-none"
              />
              <p className="text-xs text-slate-500">
                クレーム連絡してきた営業担当のメアドを入力。サーバー側の購入履歴を削除します。
                空欄なら管理者ブラウザの保存メアドが使われます。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pb-[max(0rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  setConfirmRemoveOne(null);
                  setTargetEmail("");
                }}
                className="h-12 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold active:bg-slate-50"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmRemoveOne) {
                    removeSinglePurchaseImpl(
                      confirmRemoveOne,
                      targetEmail.trim() || undefined,
                    );
                  }
                  setConfirmRemoveOne(null);
                  setTargetEmail("");
                }}
                className="h-12 rounded-lg bg-slate-900 text-white font-bold active:bg-slate-800"
              >
                未購入に戻す
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}日前`;
  return new Date(ts).toLocaleDateString("ja-JP");
}
