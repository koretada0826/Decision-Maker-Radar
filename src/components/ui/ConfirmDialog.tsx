"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useModalBackButton } from "@/lib/use-modal-back";

type Tone = "danger" | "default";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "確認する",
  cancelLabel = "やめる",
  tone = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useModalBackButton(open, onCancel);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 active:bg-red-700"
      : "bg-slate-900 active:bg-slate-800";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[4000] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-5">
          {tone === "danger" && (
            <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={24} aria-hidden="true" />
            </div>
          )}
          <h2 id="confirm-title" className="font-bold text-slate-900 text-lg">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">
              {description}
            </p>
          )}
        </div>
        <div className="px-4 pb-4 pb-[max(1rem,env(safe-area-inset-bottom))] grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold active:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-12 rounded-lg text-white font-bold ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
