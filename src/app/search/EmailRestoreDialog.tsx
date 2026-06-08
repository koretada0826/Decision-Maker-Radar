"use client";

import { useEffect, useRef, useState } from "react";
import { X, Mail } from "lucide-react";
import { useModalBackButton } from "@/lib/use-modal-back";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailRestoreDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (email: string) => Promise<void> | void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useModalBackButton(true, onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // モバイルで自動キーボード起動を避けるため focus はしない
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      setError("メールアドレスの形式が正しくありません");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(v);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-title"
      className="fixed inset-0 z-[2500] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] flex flex-col">
        <div className="shrink-0 bg-white flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="restore-title" className="font-bold">
            購入を復元
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-slate-100 active:bg-slate-200"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={submit}
          className="flex-1 flex flex-col overflow-y-auto"
        >
          <div className="p-4 space-y-3 flex-1">
          <p className="text-sm text-slate-600">
            購入時にStripeへ入力したメールアドレスを入れてください。そのアドレスの購入履歴をリストに復元します。
          </p>
          <label className="block space-y-1">
            <span className="block text-sm font-medium text-slate-700">
              メールアドレス
            </span>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 pl-10 pr-3 rounded-xl border border-slate-300 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
                aria-required="true"
                aria-invalid={error ? "true" : "false"}
              />
            </div>
          </label>
            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                {error}
              </p>
            )}
            <p className="text-xs text-slate-500">
              ※ 本人確認はメールアドレスのみで行っています。
            </p>
          </div>
          {/* sticky フッター（キーボード表示時もボタンが見える） */}
          <div className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-12 rounded-lg bg-slate-900 text-white font-bold active:bg-slate-800 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {loading ? "復元中…" : "購入履歴を復元する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
