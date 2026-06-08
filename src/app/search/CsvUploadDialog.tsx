"use client";

import { useState } from "react";
import Papa from "papaparse";
import { X, AlertTriangle, Info } from "lucide-react";
import { calculateScore, isHardCut } from "@/lib/scoring";
import {
  buildColumnMap,
  getCell,
  parseFlexibleDate,
  toHalfWidth,
  cleanIndustry,
  decodeBuffer,
  getAddress2,
  findSizeColumn,
  isReasonableContactDate,
  type ColumnMap,
} from "@/lib/csv-mapping";
import { makeDedupKey } from "@/lib/utils";
import type {
  CallResult,
  CallTemperature,
  ComplaintRisk,
  ContactPersonType,
} from "@/lib/supabase/types";
import type { Lead } from "@/lib/types";

const RESULTS: CallResult[] = [
  "not_interested",
  "busy",
  "send_material",
  "call_back_later",
  "no_budget",
  "already_using",
  "strong_rejection",
  "complaint",
  "other",
];
const TEMPS: CallTemperature[] = ["hot", "warm", "neutral", "cold", "danger"];
const RISKS: ComplaintRisk[] = ["low", "medium", "high", "blocked"];

function normalizePerson(v: string | undefined): ContactPersonType | null {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (
    s === "representative" ||
    s.includes("代表") ||
    s.includes("社長") ||
    s.includes("オーナー") ||
    s.includes("取締役")
  )
    return "representative";
  if (
    s === "decision_maker" ||
    s.includes("決裁") ||
    s.includes("決済") ||
    s.includes("役員") ||
    s.includes("部長") ||
    s.includes("責任者") ||
    s.includes("店長") ||
    s.includes("マネ")
  )
    return "decision_maker";
  if (s === "manager" || s.includes("管理職") || s.includes("課長"))
    return "manager";
  if (s === "staff" || s.includes("担当") || s.includes("一般"))
    return "staff";
  return "unknown";
}

function normalizeResult(v: string): CallResult {
  const s = toHalfWidth(v.trim()).toLowerCase();
  if (RESULTS.includes(s as CallResult)) return s as CallResult;
  if (s.includes("クレーム") || s.includes("complaint")) return "complaint";
  if (s.includes("拒否") || s.includes("strong")) return "strong_rejection";
  if (
    s.includes("興味") ||
    s.includes("不要") ||
    s.includes("結構") ||
    s.includes("ng") ||
    s.includes("受注ng")
  )
    return "not_interested";
  if (s.includes("予算") || s.includes("budget")) return "no_budget";
  if (s.includes("他社") || s.includes("既存") || s.includes("利用中"))
    return "already_using";
  if (s.includes("資料") || s.includes("material")) return "send_material";
  if (s.includes("再") || s.includes("折") || s.includes("back"))
    return "call_back_later";
  if (s.includes("不在") || s.includes("busy") || s.includes("多忙"))
    return "busy";
  return "other";
}

function normalizeTemp(v: string): CallTemperature {
  const s = v.trim().toLowerCase();
  if (TEMPS.includes(s as CallTemperature)) return s as CallTemperature;
  if (s.includes("ホット") || s === "hot" || s.includes("高")) return "hot";
  if (s.includes("ウォーム") || s.includes("warm") || s.includes("中"))
    return "warm";
  if (s.includes("コールド") || s.includes("cold") || s.includes("低"))
    return "cold";
  return "neutral";
}

function normalizeRisk(v: string): ComplaintRisk {
  const s = v.trim().toLowerCase();
  if (RISKS.includes(s as ComplaintRisk)) return s as ComplaintRisk;
  if (s.includes("blocked") || s.includes("禁止")) return "blocked";
  if (s.includes("high") || s.includes("高")) return "high";
  if (s.includes("medium") || s.includes("中")) return "medium";
  return "low";
}

// 住所から区を抽出
function extractWardFromAddress(addr: string): string {
  const m = addr.match(/(.*?[都道府県])?(.+?[市区町村])/);
  return m?.[2] ?? "";
}

export function CsvUploadDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (leads: Lead[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    added: number;
    excluded: number;
    errors: number;
    map: ColumnMap;
    notes: string[];
    encoding?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setSummary(null);
    let text: string;
    let encoding: "utf-8" | "shift_jis" | "fallback" = "utf-8";
    try {
      const buf = await file.arrayBuffer();
      const decoded = decodeBuffer(buf);
      text = decoded.text;
      encoding = decoded.encoding;
    } catch (e) {
      setError(`ファイル読み込みに失敗しました: ${(e as Error).message}`);
      setLoading(false);
      return;
    }
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\ufeff/, "").trim(),
      complete: (res) => {
        const rows = res.data ?? [];
        const headers = res.meta?.fields ?? [];
        const colMap = buildColumnMap(headers);
        const sizeCol = findSizeColumn(headers);
        const notes: string[] = [];

        if (encoding === "shift_jis") {
          notes.push("ファイルを Shift-JIS として読み込みました。");
        } else if (encoding === "fallback") {
          notes.push(
            "文字エンコーディングを判定できませんでした。文字化けがある場合は UTF-8 で保存し直してください。",
          );
        }

        if (!colMap.company_name) {
          setError(
            "会社名の列が見つかりませんでした（会社名 / 法人名 / 名前 / company_name 等）。",
          );
          setLoading(false);
          return;
        }

        // 接触日時の列がない場合は、ファイル名や本日日付で補完
        const hasTimeCol = !!colMap.contact_time;
        if (!hasTimeCol) {
          notes.push(
            "接触日時の列がないため、すべて「シルバー（¥200）」として登録します。最新の鮮度判定はできません。",
          );
        }

        // 接触相手の列がない場合は、全件「決裁者」扱い
        const hasPersonCol = !!colMap.contact_person_type;
        if (!hasPersonCol) {
          notes.push(
            "接触相手の列がないため、すべて「決裁者接触」として登録します。",
          );
        }

        const leads: Lead[] = [];
        let added = 0;
        let excluded = 0;
        let errors = 0;

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i] ?? {};
          const companyName = getCell(r, colMap, "company_name");
          if (!companyName) {
            errors++;
            continue;
          }

          // 接触日時
          let d: Date | null = null;
          if (hasTimeCol) {
            d = parseFlexibleDate(getCell(r, colMap, "contact_time"));
            // 異常な日付（未来100日先や30年前等）は無効化
            if (d && !isReasonableContactDate(d)) d = null;
          }
          // 日時列なし or パース失敗 or 範囲外 → 4時間前にしてシルバー扱い
          if (!d) d = new Date(Date.now() - 4 * 60 * 60 * 1000);

          // 接触相手：列が無い場合は decision_maker 扱い
          let person: ContactPersonType;
          if (hasPersonCol) {
            const p = normalizePerson(getCell(r, colMap, "contact_person_type"));
            // 列はあるが値が representative/decision_maker でないものはスキップ
            if (p === "representative" || p === "decision_maker") {
              person = p;
            } else {
              // 代表/決裁以外もリストには入れるが、判定は manager 等として残す
              // 営業マン用画面の趣旨から外れるため、ここでは取り込み対象を厳格化せず
              // 「decision_maker 扱い」にして取り込む（運用判断は後で）
              person = "decision_maker";
            }
          } else {
            person = "decision_maker";
          }

          const result = normalizeResult(getCell(r, colMap, "call_result"));
          const temp = normalizeTemp(getCell(r, colMap, "call_temperature"));
          const risk = normalizeRisk(getCell(r, colMap, "complaint_risk"));
          const visitAllowedRaw = getCell(r, colMap, "visit_allowed");
          const allowed = !["false", "0", "no", "FALSE", "不可", "禁止"].includes(
            visitAllowedRaw,
          );

          if (
            isHardCut({
              call_result: result,
              complaint_risk: risk,
              visit_allowed: allowed,
            })
          ) {
            excluded++;
            continue;
          }

          const address1 = getCell(r, colMap, "address");
          const address2 = getAddress2(r);
          const address = [address1, address2]
            .filter(Boolean)
            .join(" ")
            .trim();
          const explicitWard = getCell(r, colMap, "ward");
          const ward = explicitWard || extractWardFromAddress(address);
          const industryRaw = getCell(r, colMap, "industry");
          const industry = cleanIndustry(industryRaw) || industryRaw || null;

          const { score, rank } = calculateScore({
            contact_time: d,
            contact_person_type: person,
            call_result: result,
            call_temperature: temp,
            complaint_risk: risk,
          });

          const phoneVal = getCell(r, colMap, "phone") || null;
          const sizeVal = sizeCol ? (r[sizeCol] ?? "").toString().trim() || null : null;
          const dedupKey = makeDedupKey(companyName, phoneVal);
          // id は dedup_key 基準で安定化（CSV再取込で同じ会社が別IDに化けるのを防ぐ）
          const stableId = dedupKey
            ? `lead-${dedupKey.replace(/[^a-z0-9|]/g, "").slice(0, 80)}`
            : `csv-${Date.now()}-${i}`;
          leads.push({
            id: stableId,
            dedup_key: dedupKey,
            company_name: companyName,
            address,
            ward,
            industry,
            size: sizeVal,
            phone: phoneVal,
            rank,
            score,
            contact_time: d.toISOString(),
            contact_person_type: person,
            call_result: result,
            memo: getCell(r, colMap, "memo") || null,
            source: "csv",
          });
          added++;
        }

        // データ行が0の場合（ヘッダーだけのCSV）専用エラー
        if (rows.length === 0) {
          setError("ファイルにデータ行がありません。ヘッダーだけのCSVのようです。");
          setLoading(false);
          return;
        }

        setSummary({
          total: rows.length,
          added,
          excluded,
          errors,
          map: colMap,
          notes,
          encoding,
        });
        if (leads.length > 0) onAdd(leads);
        setLoading(false);
      },
      error: () => {
        setError("CSVの形式が認識できませんでした。Excelで「CSV UTF-8」として保存し直してお試しください。");
        setLoading(false);
      },
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-title"
      className="fixed inset-0 z-[2000] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => {
        if (!loading && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-lg max-h-[90dvh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="csv-title" className="font-bold">CSVをアップロード</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3 text-sm">
          <p className="text-slate-600">
            お手元のCSVをそのまま取り込めます（日本語の列名OK）。
          </p>

          <details className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
            <summary className="cursor-pointer font-semibold">
              認識される列名（自動マッピング）
            </summary>
            <div className="mt-2 space-y-1">
              <p>
                <strong>会社名：</strong> 会社名 / 法人名 / 社名 / 企業名 / company_name
              </p>
              <p>
                <strong>住所：</strong> 住所 / 所在地 / address
              </p>
              <p>
                <strong>電話：</strong> 電話 / 電話番号 / TEL / phone
              </p>
              <p>
                <strong>業種：</strong> 業種 / 業界 / 業態 / industry
              </p>
              <p>
                <strong>接触日時：</strong> 接触日時 / 架電日時 / 日時 / 日付 / contact_time
              </p>
              <p>
                <strong>接触相手：</strong> 接触相手 / 担当者 / 役職 / 対応者
              </p>
              <p>
                <strong>結果：</strong> 結果 / アポ結果 / NG理由 / ステータス
              </p>
              <p>
                <strong>備考：</strong> 備考 / メモ / コメント / 詳細 / NGメモ
              </p>
              <p className="mt-2">
                <strong>受け入れる役職の値：</strong> 代表 / 社長 / オーナー / 取締役 / 決裁 / 役員 / 部長 / 責任者 / 店長 / 担当 など
              </p>
              <a
                href="/sample_import.csv"
                download
                className="inline-block mt-1 underline text-brand-700"
              >
                サンプルCSVをダウンロード
              </a>
            </div>
          </details>

          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              CSVファイル（UTF-8）
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                // 同名ファイル再選択を可能にする
                e.target.value = "";
              }}
              className="block w-full text-sm file:mr-4 file:h-11 file:px-4 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold"
            />
          </label>

          {loading && <p className="text-sm text-slate-500">解析中…</p>}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
          )}

          {summary && (
            <>
              <div
                className={`rounded-xl p-3 text-sm ${
                  summary.added > 0
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-red-50 text-red-900 border border-red-200"
                }`}
              >
                <div className="font-bold tabular-nums">
                  {summary.added > 0
                    ? `${summary.added}件 をリストに追加しました`
                    : "追加できたデータがありませんでした"}
                </div>
                <div className="text-xs mt-1 tabular-nums">
                  総行数: {summary.total} 件 ／ 除外: {summary.excluded} 件 ／ エラー: {summary.errors} 件
                </div>
                {summary.added === 0 && (
                  <div className="text-xs mt-2 text-red-800">
                    列名（会社名・住所など）が認識できなかった可能性があります。下の「検出された列のマッピング」をご確認ください。
                  </div>
                )}
                {/* リスト確認ボタンは sticky フッターへ移動済み */}
              </div>

              {summary.notes.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={16}
                      className="text-amber-700 shrink-0 mt-0.5"
                    />
                    <ul className="space-y-1 text-amber-900">
                      {summary.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-slate-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">
                      検出された列のマッピング
                    </div>
                    <ul className="mt-1 space-y-0.5 text-slate-700">
                      {Object.entries(summary.map).map(([k, v]) => (
                        <li key={k}>
                          <code className="bg-white border border-slate-200 rounded px-1">
                            {k}
                          </code>
                          {" ← "}
                          <span className="font-semibold">{v}</span>
                        </li>
                      ))}
                      {Object.keys(summary.map).length === 0 && (
                        <li>列を自動マッピングできませんでした。</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        </div>
        {/* sticky フッター */}
        {summary && summary.added > 0 && (
          <div className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={onClose}
              className="w-full h-12 rounded-lg bg-emerald-600 text-white font-bold active:bg-emerald-700 active:scale-[0.99] transition-transform"
            >
              リストで確認する（{summary.added}件）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
