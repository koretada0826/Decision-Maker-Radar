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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pill, RankBadge } from "@/components/ui/Badge";
import { callResultLabel, personLabel } from "@/lib/labels";
import { humanMinutesAgo, googleMapsLink } from "@/lib/utils";
import { LEAD_PRICE_JPY, maskAddress } from "@/lib/purchases";
import type { Lead } from "@/lib/types";

export function LeadCard({
  lead,
  purchased,
}: {
  lead: Lead;
  purchased: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          leadName: lead.company_name,
          leadSnapshot: {
            company_name: lead.company_name,
            address: lead.address,
            ward: lead.ward,
            industry: lead.industry,
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

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <RankBadge rank={lead.rank} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 truncate">
                {lead.company_name}
              </h3>
              {purchased ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                  <BadgeCheck size={11} />
                  購入済
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                  <Lock size={10} />
                  未購入
                </span>
              )}
              {lead.source === "csv" && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-semibold">
                  CSV
                </span>
              )}
            </div>

            {/* 住所 */}
            <p
              className={`text-xs mt-1 leading-snug font-mono ${
                purchased ? "text-slate-700" : "text-slate-400 select-none"
              }`}
            >
              {purchased ? lead.address : maskAddress(lead.address)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <Pill tone="neutral">{lead.ward}</Pill>
              {lead.industry && <Pill tone="neutral">{lead.industry}</Pill>}
              <Pill tone="info">{personLabel[lead.contact_person_type]}</Pill>
              <Pill tone="neutral">{callResultLabel[lead.call_result]}</Pill>
              <span className="text-slate-500">
                {humanMinutesAgo(lead.contact_time)}
              </span>
            </div>

            {purchased && lead.memo && (
              <p className="mt-2 text-xs text-slate-700 bg-slate-50 border-l-2 border-emerald-500 px-2 py-1.5 leading-snug line-clamp-2 rounded-r">
                {lead.memo}
              </p>
            )}
            {!purchased && (
              <p className="mt-2 text-[11px] text-slate-400">
                住所詳細・電話・メモは購入後に解放
              </p>
            )}
          </div>
        </div>

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
              className="mt-3 w-full h-12 inline-flex items-center justify-center gap-2 bg-red-600 text-white text-base font-bold rounded-lg shadow-sm active:bg-red-700 disabled:opacity-60"
            >
              <ShoppingCart size={18} />
              {loading
                ? "準備中..."
                : `${LEAD_PRICE_JPY.toLocaleString()}円でリスト購入`}
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
