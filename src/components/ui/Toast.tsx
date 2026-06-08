"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Check, AlertCircle, Info } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

type Ctx = {
  show: (message: string, tone?: ToastTone) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[5000] flex flex-col gap-2 pointer-events-none"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <ToastView key={t.id} tone={t.tone} message={t.message} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastView({ tone, message }: { tone: ToastTone; message: string }) {
  const tones: Record<ToastTone, { bg: string; icon: React.ReactNode }> = {
    success: {
      bg: "bg-emerald-600",
      icon: <Check size={18} aria-hidden="true" />,
    },
    error: {
      bg: "bg-red-600",
      icon: <AlertCircle size={18} aria-hidden="true" />,
    },
    info: {
      bg: "bg-slate-900",
      icon: <Info size={18} aria-hidden="true" />,
    },
  };
  const t = tones[tone];
  return (
    <div
      className={`pointer-events-auto inline-flex items-center gap-2 px-4 h-12 rounded-lg shadow-xl text-white text-sm font-semibold ${t.bg}`}
    >
      {t.icon}
      <span>{message}</span>
    </div>
  );
}

export function useToast(): Ctx {
  const v = useContext(ToastCtx);
  if (!v) {
    return { show: () => {} };
  }
  return v;
}
