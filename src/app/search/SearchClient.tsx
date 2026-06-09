"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Tag, X, Sparkles, Inbox, SearchX } from "lucide-react";
import { LeadCard } from "./LeadCard";
import { PickerModal, type PickerOption } from "./PickerModal";
import { EmailRestoreDialog } from "./EmailRestoreDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  getPurchasedIds,
  setPurchasedIds,
  getStoredEmail,
  setStoredEmail,
  getPurchasedDedupKeys,
  addPurchasedDedupKey,
  normalizeEmail,
} from "@/lib/purchases";
import { computeHotness } from "@/lib/hotness";
import { makeDedupKey } from "@/lib/utils";
import type { Lead } from "@/lib/types";

const STORAGE_KEY = "kr-uploaded-leads-v2";

export function SearchClient({ initial }: { initial: Lead[] }) {
  const toast = useToast();
  const [uploaded, setUploaded] = useState<Lead[]>([]);
  const [areas, setAreas] = useState<Set<string>>(new Set());
  const [industries, setIndustries] = useState<Set<string>>(new Set());
  const [rankFilter, setRankFilter] = useState({
    platinum: false,
    emerald: false,
    silver: false,
  });
  const [halfPriceOnly, setHalfPriceOnly] = useState(false);
  const [purchasedOnly, setPurchasedOnly] = useState(false);
  const [picker, setPicker] = useState<"area" | "industry" | null>(null);
  const [purchasedIds, setLocalPurchasedIds] = useState<Set<string>>(new Set());
  const [purchasedKeys, setPurchasedKeys] = useState<Set<string>>(new Set());
  const [clearAllConfirm, setClearAllConfirm] = useState(false);

  // localStorage疎通テスト（プライベートブラウズや設定で無効化されてないか）
  useEffect(() => {
    try {
      const probe = "_kr_probe";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
    } catch {
      toast.show(
        "このブラウザでは購入記録が保存できません。設定をご確認ください。",
        "error",
      );
    }
    // 初回マウントのみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 60秒ごとに再評価 → 並び順・フィルター・全LeadCardのランクが時間経過で更新される
  // 全体で1本のタイマーに集約（数百カード分の setInterval 並走を回避）
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // /admin から戻ってきた時、/success から戻ってきた時に再読込
  useEffect(() => {
    function refresh() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) {
          // 要素の型ガード：必須フィールドを持つオブジェクトだけ残す
          const valid = parsed.filter(
            (x): x is Lead =>
              x != null &&
              typeof x === "object" &&
              typeof x.id === "string" &&
              typeof x.company_name === "string",
          );
          setUploaded(valid);
        } else {
          setUploaded([]);
        }
      } catch {}
      const ids = getPurchasedIds();
      setLocalPurchasedIds(new Set(ids));
      setPurchasedKeys(new Set(getPurchasedDedupKeys()));
      // 旧バージョンの localStorage に dedup_key 履歴がない場合、現在の uploaded から推定して埋める
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const list: Lead[] = Array.isArray(parsed) ? parsed : [];
        const idSet = new Set(ids);
        for (const l of list) {
          if (idSet.has(l.id) && l.dedup_key) {
            addPurchasedDedupKey(l.dedup_key);
          }
        }
      } catch {}
    }
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // メアドが保存されていれば、サーバー（Supabase）から購入履歴を同期
  useEffect(() => {
    const email = getStoredEmail();
    if (!email) return;
    fetch(`/api/purchases?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok || !data.purchases) return;
        type P = {
          lead_id: string;
          company_name: string;
          address: string | null;
          ward: string | null;
          industry: string | null;
          phone: string | null;
          memo: string | null;
          rank: string;
          score: number | null;
          contact_time: string | null;
          contact_person_type: string | null;
          call_result: string | null;
        };
        const purchases = data.purchases as P[];
        const serverIds = new Set(purchases.map((p) => p.lead_id));
        // サーバーを真として localStorage を置き換える（管理者が単件解除した分はここで消える）
        // 例外：サーバーが「空配列」を返した場合のみ、Stripe webhook 遅延の可能性があるので
        // localStorage を維持（保守的）。ただしサーバー側で削除済みのものは復活してしまうので、
        // 確実に解除したい場合は admin から個別解除＋営業端末再ロードが必要。
        if (purchases.length === 0) return;
        setPurchasedIds(Array.from(serverIds));
        setLocalPurchasedIds(serverIds);
        // 元データが localStorage に無いリードは「購入したけど取り込み済み未登録」状態
        // → サーバーのスナップショットから復元してリストに表示する
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const current: Lead[] = raw ? JSON.parse(raw) : [];
          const existingIds = new Set(current.map((l) => l.id));
          // サーバー復元時：保存メアドの全購入を「再購入として認識」するために
          // dedup_key を再計算して localStorage の履歴に積む
          for (const p of purchases) {
            const k = makeDedupKey(p.company_name, p.phone);
            if (k) addPurchasedDedupKey(k);
          }
          setPurchasedKeys(new Set(getPurchasedDedupKeys()));

          const restored: Lead[] = purchases
            .filter((p) => !existingIds.has(p.lead_id))
            .map((p) => ({
              id: p.lead_id,
              dedup_key: makeDedupKey(p.company_name, p.phone),
              company_name: p.company_name,
              address: p.address ?? "",
              ward: p.ward ?? "",
              industry: p.industry,
              size: null,
              phone: p.phone,
              rank: (p.rank ?? "D") as Lead["rank"],
              score: p.score ?? 0,
              // 元の contact_time が無ければ「10年前」固定でシルバー扱いにする
              // （Date.now() フォールバックだと復元時にプラチナ¥1000化する事故を防止）
              contact_time:
                p.contact_time ??
                new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
              contact_person_type:
                (p.contact_person_type ??
                  "decision_maker") as Lead["contact_person_type"],
              call_result: (p.call_result ??
                "other") as Lead["call_result"],
              memo: p.memo,
              source: "csv",
            }));
          if (restored.length > 0) {
            const merged = [...restored, ...current];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            setUploaded(merged);
          }
        } catch {}
      })
      .catch(() => {});
  }, []);

  const [restoreOpen, setRestoreOpen] = useState(false);

  async function restoreByEmail(email: string) {
    // 全角・スペース・大文字を正規化（CSV取り込みでも同じ正規化を使う）
    const normalized = normalizeEmail(email);
    // 12秒でタイムアウトする AbortController
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12_000);
    let res: Response;
    try {
      res = await fetch(
        `/api/purchases?email=${encodeURIComponent(normalized)}`,
        { signal: controller.signal },
      );
    } catch (e) {
      clearTimeout(t);
      if ((e as Error).name === "AbortError") {
        throw new Error("通信がタイムアウトしました。電波の良い場所で再度お試しください。");
      }
      throw new Error("通信エラーが発生しました。電波の良い場所で再度お試しください。");
    }
    clearTimeout(t);
    const data = await res.json();
    if (!data.ok) {
      throw new Error(
        data.reason === "supabase_not_configured"
          ? "現在オンライン復元は利用できません。管理者にお問い合わせください。"
          : "復元に失敗しました。時間をおいて再度お試しください。",
      );
    }
    if (!data.purchases || data.purchases.length === 0) {
      throw new Error("該当する購入履歴が見つかりませんでした");
    }
    setStoredEmail(normalized);
    toast.show(`${data.purchases.length} 件の購入履歴を復元しました`, "success");
    setTimeout(() => window.location.reload(), 800);
  }

  const all = useMemo(() => [...uploaded, ...initial], [uploaded, initial]);

  // 業種・区の集計（ピッカー用）
  const industryOptions = useMemo<PickerOption[]>(() => {
    const m = new Map<string, number>();
    for (const l of all) {
      if (!l.industry) continue;
      m.set(l.industry, (m.get(l.industry) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }, [all]);

  const areaOptions = useMemo<PickerOption[]>(() => {
    const m = new Map<string, number>();
    for (const l of all) {
      if (!l.ward) continue;
      m.set(l.ward, (m.get(l.ward) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }, [all]);

  // 絞り込み（業種ORxエリアORで AND）
  const results = useMemo(() => {
    return all
      .filter((l) =>
        industries.size === 0
          ? true
          : l.industry !== null && industries.has(l.industry),
      )
      .filter((l) => (areas.size === 0 ? true : areas.has(l.ward)))
      .filter((l) => {
        // ランクフィルター（OR）：何もチェックなし or 全選択ならフィルタなし扱い
        const anyRank =
          rankFilter.platinum || rankFilter.emerald || rankFilter.silver;
        const allRank =
          rankFilter.platinum && rankFilter.emerald && rankFilter.silver;
        if (!anyRank || allRank) return true;
        const h = computeHotness(l.contact_time, now);
        if (rankFilter.platinum && h === "platinum") return true;
        if (rankFilter.emerald && h === "emerald") return true;
        if (rankFilter.silver && h === "silver") return true;
        return false;
      })
      .filter((l) => {
        // 半額対象のみ（AND）
        if (!halfPriceOnly) return true;
        const isHalf =
          !purchasedIds.has(l.id) &&
          !!l.dedup_key &&
          purchasedKeys.has(l.dedup_key);
        return isHalf;
      })
      .filter((l) => (purchasedOnly ? purchasedIds.has(l.id) : true))
      .sort((a, b) => {
        const rank = (l: Lead) => {
          const h = computeHotness(l.contact_time, now);
          return h === "platinum" ? 0 : h === "emerald" ? 1 : 2;
        };
        const r = rank(a) - rank(b);
        if (r !== 0) return r;
        return (
          new Date(b.contact_time).getTime() -
          new Date(a.contact_time).getTime()
        );
      });
  }, [all, industries, areas, rankFilter, halfPriceOnly, purchasedOnly, purchasedIds, purchasedKeys, now]);

  function removeArea(v: string) {
    setAreas((s) => {
      const n = new Set(s);
      n.delete(v);
      return n;
    });
  }
  function removeIndustry(v: string) {
    setIndustries((s) => {
      const n = new Set(s);
      n.delete(v);
      return n;
    });
  }

  return (
    <div className="min-h-dvh pb-16">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
        <div className="px-4 h-14 flex items-center gap-2">
          <div className="font-bold tracking-wide">決裁者レーダー</div>
          <button
            onClick={() => setRestoreOpen(true)}
            className="ml-auto inline-flex items-center justify-center h-11 px-3 rounded-lg bg-white/10 text-white text-xs font-semibold active:bg-white/20"
            title="別端末・キャッシュクリア後の復元"
          >
            購入を復元
          </button>
          <span className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-white/10 text-white text-[11px] tabular-nums">
            <span className="text-white/80 text-[11px]">マイリスト</span>
            {purchasedIds.size}
          </span>
        </div>
      </header>

      {/* 2大ボタン（エリア / 業種） */}
      <div className="sticky top-14 z-20 bg-white border-b border-slate-200 px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <FilterButton
            icon={<MapPin size={18} />}
            label="エリア"
            count={areas.size}
            summary={summaryFromSet(areas)}
            color="emerald"
            onClick={() => setPicker("area")}
          />
          <FilterButton
            icon={<Tag size={18} />}
            label="業種"
            count={industries.size}
            summary={summaryFromSet(industries)}
            color="sky"
            onClick={() => setPicker("industry")}
          />
        </div>

        {/* 選択チップ */}
        {(areas.size > 0 || industries.size > 0) && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {Array.from(areas).map((v) => (
              <Chip
                key={`a-${v}`}
                category="エリア"
                value={v}
                onRemove={() => removeArea(v)}
              />
            ))}
            {Array.from(industries).map((v) => (
              <Chip
                key={`i-${v}`}
                category="業種"
                value={v}
                onRemove={() => removeIndustry(v)}
              />
            ))}
            <button
              type="button"
              onClick={() => {
                if (areas.size + industries.size > 1) {
                  setClearAllConfirm(true);
                } else {
                  setAreas(new Set());
                  setIndustries(new Set());
                }
              }}
              className="inline-flex items-center h-11 px-3 text-xs text-slate-600 underline self-center active:bg-slate-100 rounded-md"
            >
              すべて解除
            </button>
          </div>
        )}

        {/* 結果バー */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-600 gap-3 flex-wrap">
          <span className="tabular-nums">
            <span className="font-semibold text-slate-900">
              {results.length}
            </span>
            <span> 件 / 全 {all.length} 件</span>
          </span>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={halfPriceOnly}
                onChange={(e) => setHalfPriceOnly(e.target.checked)}
                className="accent-slate-900 w-4 h-4"
              />
              <span className="inline-flex items-center gap-1">
                <Sparkles size={14} className="text-amber-500" aria-hidden="true" />
                半額のみ
              </span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={purchasedOnly}
                onChange={(e) => setPurchasedOnly(e.target.checked)}
                className="accent-slate-900 w-4 h-4"
              />
              <span>購入済みのみ</span>
            </label>
          </div>
        </div>

        {/* ランクフィルター：3チップ（鮮度のみ） */}
        <div className="mt-2 -mx-1 px-1 overflow-x-auto snap-x-chips">
          <div className="flex items-center gap-1.5 flex-nowrap">
            <RankToggle
              active={rankFilter.platinum}
              onClick={() =>
                setRankFilter((s) => ({ ...s, platinum: !s.platinum }))
              }
              label="プラチナ"
              hint="1時間以内 ¥1,000"
              dot="bg-slate-900 ring-1 ring-amber-400"
              activeClass="bg-slate-900 text-amber-300 border-slate-900"
            />
            <RankToggle
              active={rankFilter.emerald}
              onClick={() =>
                setRankFilter((s) => ({ ...s, emerald: !s.emerald }))
              }
              label="エメラルド"
              hint="3時間以内 ¥600"
              dot="bg-emerald-600"
              activeClass="bg-emerald-600 text-white border-emerald-700"
            />
            <RankToggle
              active={rankFilter.silver}
              onClick={() =>
                setRankFilter((s) => ({ ...s, silver: !s.silver }))
              }
              label="シルバー"
              hint="3時間超 ¥200"
              dot="bg-slate-400"
              activeClass="bg-slate-300 text-slate-900 border-slate-400"
            />
          </div>
        </div>
      </div>

      {/* 取込分のバッジ（クリアは/admin側） */}
      {uploaded.length > 0 && (
        <div className="px-3 pt-2 text-[11px] text-slate-500 flex items-center gap-2">
          <span className="inline-block bg-emerald-100 text-emerald-800 rounded px-1.5 py-0.5 tabular-nums">
            取り込み分 {uploaded.length} 件を表示中
          </span>
        </div>
      )}

      {/* リスト */}
      <section className="px-3 py-3 space-y-2 max-w-3xl mx-auto">
        {results.length === 0 ? (
          all.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              <Inbox size={40} className="mx-auto mb-2 text-slate-400" aria-hidden="true" />
              <p>まだリードがありません。</p>
              <p>管理者がCSVを取り込むとここに表示されます。</p>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-sm">
              <SearchX size={40} className="mx-auto mb-2 text-slate-400" aria-hidden="true" />
              <p>該当するリードがありません。</p>
              <p>上のボタンから条件を変えてください。</p>
            </div>
          )
        ) : (
          results.map((l) => (
            <LeadCard
              key={l.id}
              lead={l}
              purchased={purchasedIds.has(l.id)}
              isRepurchase={
                !purchasedIds.has(l.id) &&
                !!l.dedup_key &&
                purchasedKeys.has(l.dedup_key)
              }
              now={now}
            />
          ))
        )}
      </section>

      {/* ピッカーモーダル */}
      {picker === "area" && (
        <PickerModal
          kind="area"
          options={areaOptions}
          selected={areas}
          onChange={setAreas}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "industry" && (
        <PickerModal
          kind="industry"
          options={industryOptions}
          selected={industries}
          onChange={setIndustries}
          onClose={() => setPicker(null)}
        />
      )}

      {restoreOpen && (
        <EmailRestoreDialog
          onClose={() => setRestoreOpen(false)}
          onSubmit={async (email) => {
            await restoreByEmail(email);
          }}
        />
      )}

      <ConfirmDialog
        open={clearAllConfirm}
        title="絞り込み条件を解除しますか？"
        description="選択中の条件（エリア・業種）がすべて外れます。"
        confirmLabel="解除する"
        cancelLabel="やめる"
        onConfirm={() => {
          setAreas(new Set());
          setIndustries(new Set());
          setClearAllConfirm(false);
        }}
        onCancel={() => setClearAllConfirm(false)}
      />

      <footer className="mt-12 px-4 py-6 border-t border-slate-200 text-[11px] text-slate-500 max-w-3xl mx-auto flex flex-wrap gap-x-4 gap-y-2">
        <a href="/legal/terms" className="underline">
          利用規約
        </a>
        <a href="/legal/privacy" className="underline">
          プライバシーポリシー
        </a>
        <a href="/legal/tokutei" className="underline">
          特定商取引法に基づく表記
        </a>
      </footer>
    </div>
  );
}

function RankToggle({
  active,
  onClick,
  label,
  hint,
  dot,
  activeClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  dot: string;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-full border-2 text-xs font-bold transition-colors active:scale-[0.97] ${
        active
          ? activeClass
          : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span>{label}</span>
      {hint && (
        <span
          className={`text-[10px] font-normal ${active ? "opacity-80" : "opacity-50"}`}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

function summaryFromSet(s: Set<string>): string {
  if (s.size === 0) return "未指定";
  const arr = Array.from(s);
  if (arr.length === 1) return arr[0];
  return `${arr[0]} 他 ${arr.length - 1} 件`;
}

function FilterButton({
  icon,
  label,
  count,
  summary,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  summary: string;
  color?: "emerald" | "sky";
  onClick: () => void;
}) {
  const active = count > 0;
  return (
    <button
      onClick={onClick}
      className={`h-14 px-3 border text-left flex items-center gap-2 transition-colors ${
        active
          ? "border-slate-900 bg-white"
          : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <span
        className={`shrink-0 w-9 h-9 inline-flex items-center justify-center ${
          active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] text-slate-500 uppercase tracking-wider leading-none">
          {label}
        </span>
        <span
          className={`block text-sm font-bold truncate mt-1 ${
            active ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {summary}
        </span>
      </span>
      {count > 0 && (
        <span className="shrink-0 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-[11px] font-bold text-white bg-slate-900 tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}

function Chip({
  category,
  value,
  onRemove,
}: {
  color?: "emerald" | "sky";
  category: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <button
      onClick={onRemove}
      aria-label={`${category} ${value} を解除`}
      className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-md bg-slate-900 text-white text-xs font-semibold active:bg-slate-800"
    >
      <span className="text-[10px] opacity-60">{category}</span>
      <span>{value}</span>
      <X size={14} />
    </button>
  );
}
