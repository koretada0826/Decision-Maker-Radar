"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search as SearchIcon, X, Check } from "lucide-react";

export type PickerOption = {
  value: string;
  count: number;
};

export type PickerKind = "area" | "industry";

const KIND_META: Record<
  PickerKind,
  { title: string; placeholder: string; color: string }
> = {
  area: {
    title: "エリアを選ぶ",
    placeholder: "区・市・駅で絞り込み（例：新宿）",
    color: "bg-emerald-500",
  },
  industry: {
    title: "業種を選ぶ",
    placeholder: "業種で絞り込み（例：飲食）",
    color: "bg-sky-500",
  },
};

export function PickerModal({
  kind,
  options,
  selected,
  onChange,
  onClose,
}: {
  kind: PickerKind;
  options: PickerOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  onClose: () => void;
}) {
  const meta = KIND_META[kind];
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set(selected));
  const inputRef = useRef<HTMLInputElement>(null);

  // 開いた直後に検索フォーカス（スマホでキーボード自動オープン抑制のため少し遅延）
  useEffect(() => {
    // スマホで自動でキーボードが立ち上がると邪魔なのでフォーカスはしない
    // 必要な時はユーザーがタップする
    return;
  }, []);

  // ESCで閉じる、bodyスクロール抑制
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.value.toLowerCase().includes(q));
  }, [query, options]);

  function toggle(v: string) {
    setDraft((s) => {
      const next = new Set(s);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function apply() {
    onChange(draft);
    onClose();
  }

  function clearDraft() {
    setDraft(new Set());
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-white flex flex-col">
      {/* ヘッダー */}
      <header className="shrink-0 sticky top-0 bg-white border-b border-slate-200">
        <div className="h-14 px-2 flex items-center gap-1">
          <button
            onClick={onClose}
            className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-700"
            aria-label="閉じる"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-bold text-slate-900">{meta.title}</h2>
          <div className="ml-auto flex items-center gap-1 pr-2">
            {draft.size > 0 && (
              <button
                onClick={clearDraft}
                className="text-xs text-slate-500 underline"
              >
                解除
              </button>
            )}
            <span className="inline-flex items-center px-2 h-7 bg-slate-900 text-white text-xs font-bold tabular-nums">
              {draft.size} 件
            </span>
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="relative">
            <SearchIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full h-11 pl-9 pr-9 rounded-none bg-slate-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="クリア"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            該当する候補がありません
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((o) => {
              const checked = draft.has(o.value);
              return (
                <li key={o.value}>
                  <button
                    onClick={() => toggle(o.value)}
                    className="w-full h-14 px-4 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span
                      className={`w-5 h-5 border inline-flex items-center justify-center shrink-0 ${
                        checked
                          ? "bg-slate-900 border-slate-900"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && <Check size={13} className="text-white" />}
                    </span>
                    <span className="flex-1 text-slate-900">
                      <Highlight text={o.value} query={query} />
                    </span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {o.count} 件
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* フッター（決定ボタン） */}
      <footer className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          onClick={apply}
          className="w-full h-12 bg-slate-900 text-white font-bold tracking-wide active:bg-slate-800"
        >
          この条件で絞り込む
        </button>
      </footer>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-slate-900 rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}
