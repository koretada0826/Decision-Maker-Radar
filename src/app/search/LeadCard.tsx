"use client";

import { useState } from "react";
import {
  MapPin,
  Copy,
  Check,
  Phone,
  Lock,
  BadgeCheck,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Badge";
import { personLabel } from "@/lib/labels";
import {
  humanMinutesAgo,
  googleMapsLink,
  truncateAddressToArea,
} from "@/lib/utils";
import {
  computeHotness,
  priceFor,
  HOTNESS_LABEL,
  HOTNESS_PRICE,
  HOTNESS_STYLE,
  REPURCHASE_PRICE,
} from "@/lib/hotness";
import {
  getStoredEmail,
  setStoredEmail,
  addPurchasedId,
  addPurchasedDedupKey,
} from "@/lib/purchases";
import type { Lead } from "@/lib/types";

export function LeadCard({
  lead,
  purchased,
  isRepurchase,
  now,
}: {
  lead: Lead;
  purchased: boolean;
  isRepurchase: boolean;
  now: number;
}) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // タイマーは親（SearchClient）で1本だけ動かして now を props で受け取る。
  // now が変わるたびに再レンダリングされ、computeHotness が再評価される。
  const hotness = computeHotness(lead.contact_time, now);
  const fullPrice = HOTNESS_PRICE[hotness];
  const finalPrice = priceFor(hotness, isRepurchase);
  // 更新版（再購入）は常に ¥1,000 → ¥500 として表示する（一律半額の見せ方）
  const repurchaseOriginal = 1000;
  const truncatedAddr = truncateAddressToArea(lead.address);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(lead.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = lead.address;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function purchase() {
    if (loading) return; // 連打/ダブルクリック防止
    setLoading(true);
    setError(null);
    try {
      // 重複購入チェック：
      // - 通常価格ボタンを押した場合：サーバーで履歴を確認、ヒットしたら警告
      // - 更新版（半額）ボタンを押した場合：ユーザーが明示的に再購入を選んでいるのでスキップ
      const storedEmail = getStoredEmail();
      if (!isRepurchase && storedEmail && lead.dedup_key) {
        try {
          const ck = await fetch(
            `/api/purchases/check?email=${encodeURIComponent(storedEmail)}&dedup_key=${encodeURIComponent(lead.dedup_key)}`,
          );
          const ckData = await ck.json();
          if (ckData.ok && ckData.alreadyPurchased) {
            const ok = confirm(
              `このリードは既に「${storedEmail}」で購入済みです。\n` +
                `（${ckData.previousPurchase?.company_name ?? "前回購入"}）\n\n` +
                `購入履歴を復元しますか？\n（OK = 復元、キャンセル = 中止）`,
            );
            if (ok) {
              addPurchasedId(lead.id);
              if (lead.dedup_key) addPurchasedDedupKey(lead.dedup_key);
              setStoredEmail(storedEmail);
              window.location.reload();
            }
            setLoading(false);
            return;
          }
        } catch {
          // チェック失敗時は通常通り進める
        }
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          leadName: lead.company_name,
          // hotness と isRepurchase はサーバー側で再判定するためヒントとしてのみ送信
          hotness,
          isRepurchase,
          dedupKey: lead.dedup_key,
          email: getStoredEmail() ?? undefined,
          leadSnapshot: {
            company_name: lead.company_name,
            address: lead.address,
            ward: lead.ward,
            industry: lead.industry,
            size: lead.size,
            phone: lead.phone,
            memo: lead.memo,
            rank: lead.rank,
            score: lead.score,
            contact_time: lead.contact_time,
            contact_person_type: lead.contact_person_type,
            call_result: lead.call_result,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "決済セッション作成に失敗しました");
      }
      window.location.href = json.url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  const hotnessStyle = HOTNESS_STYLE[hotness];

  return (
    <Card
      className={
        !purchased && isRepurchase
          ? "ring-2 ring-amber-400"
          : !purchased && hotness === "platinum"
            ? "ring-2 ring-amber-300"
            : undefined
      }
    >
      <div className="p-4">
        {/* ヘッダー：ホットネス + 状態 */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tracking-wide ${hotnessStyle.badge}`}
          >
            {HOTNESS_LABEL[hotness]}
          </span>
          {isRepurchase && !purchased && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 text-amber-900 text-[11px] font-bold animate-pulse">
              <Sparkles size={12} />
              半額 ¥500
            </span>
          )}
          {purchased && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
              <BadgeCheck size={11} />
              購入済
            </span>
          )}
          {!purchased && !isRepurchase && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
              <Lock size={10} />
              未購入
            </span>
          )}
          <span className="ml-auto text-[11px] text-slate-500">
            {humanMinutesAgo(lead.contact_time)}
          </span>
        </div>

        {/* 業種・規模感 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {lead.industry && <Pill tone="info">業種：{lead.industry}</Pill>}
          {lead.size && <Pill tone="neutral">規模：{lead.size}</Pill>}
          <Pill tone="neutral">{personLabel[lead.contact_person_type]}</Pill>
        </div>

        {/* 場所（区＋町名まで） */}
        <p className="text-sm text-slate-700 font-mono mt-1">
          {truncatedAddr}
        </p>

        {/* 購入済みのみフル情報を出す */}
        {purchased && (
          <div className="mt-2 space-y-1.5">
            <p className="text-sm font-bold text-slate-900">
              {lead.company_name}
            </p>
            <p className="text-xs text-slate-600 font-mono">{lead.address}</p>
            {lead.memo && (
              <p className="text-xs text-slate-700 bg-slate-50 border-l-2 border-emerald-500 px-2 py-1.5 leading-snug line-clamp-2 rounded-r">
                {lead.memo}
              </p>
            )}
          </div>
        )}

        {/* アクション領域 */}
        {purchased ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={googleMapsLink(lead.address || lead.company_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 inline-flex items-center justify-center gap-1.5 bg-slate-900 text-white text-sm font-bold rounded-lg active:bg-slate-800"
              >
                <MapPin size={16} />
                マップで開く
              </a>
              <button
                type="button"
                onClick={copyAddress}
                className={`h-11 inline-flex items-center justify-center gap-1.5 text-sm font-bold rounded-lg border ${
                  copied
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white text-slate-900 border-slate-300 active:bg-slate-50"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    コピー完了
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    住所をコピー
                  </>
                )}
              </button>
            </div>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="mt-2 h-10 rounded-lg border border-slate-200 bg-slate-50 inline-flex items-center justify-center gap-1.5 w-full text-slate-700 text-sm tabular-nums"
              >
                <Phone size={14} />
                {lead.phone}
              </a>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={purchase}
              disabled={loading}
              className={`mt-3 w-full h-12 inline-flex items-center justify-center gap-2 text-white text-base font-bold rounded-lg shadow-sm disabled:opacity-60 ${
                isRepurchase
                  ? "bg-amber-500 active:bg-amber-600"
                  : "bg-red-600 active:bg-red-700"
              }`}
            >
              <ShoppingCart size={18} />
              {loading ? (
                "準備中..."
              ) : isRepurchase ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-[10px] bg-amber-900/20 px-1.5 py-0.5 rounded font-bold">
                    半額
                  </span>
                  <span className="line-through opacity-60 text-sm">
                    ¥{repurchaseOriginal.toLocaleString()}
                  </span>
                  <span>¥{REPURCHASE_PRICE.toLocaleString()} で購入</span>
                </span>
              ) : (
                `${finalPrice.toLocaleString()}円でリスト購入`
              )}
            </button>
            {error && (
              <p className="mt-2 text-xs text-red-700 bg-red-50 rounded-lg p-2">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
