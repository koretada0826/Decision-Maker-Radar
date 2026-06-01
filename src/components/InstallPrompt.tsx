"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X, Plus } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "kr-pwa-install-dismissed-v1";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7日間表示しない

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad on modern Safari は "Macintosh" + touch points で判別
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari
  // @ts-expect-error vendor prop
  if (window.navigator.standalone) return true;
  // PWA Android
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // 既にインストール済み

    // 直近で「あとで」を押されていたらしばらく出さない
    try {
      const v = localStorage.getItem(DISMISS_KEY);
      if (v && Date.now() - Number(v) < DISMISS_DURATION_MS) return;
    } catch {}

    // Android Chrome: beforeinstallprompt を受け取る
    function onBIP(e: Event) {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onBIP as EventListener);

    // iOS は beforeinstallprompt が無いので手動案内
    if (isIOS()) {
      setIosMode(true);
      // 初回訪問から 5秒後に出す（即座に出すと邪魔）
      const t = setTimeout(() => setShow(true), 5000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBIP as EventListener);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP as EventListener);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {}
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  if (iosMode) {
    return (
      <div className="fixed bottom-3 inset-x-3 z-[2500] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-3 md:max-w-md md:mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-400 text-slate-900 inline-flex items-center justify-center font-bold">
            <Download size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold">ホーム画面に追加</div>
            <p className="text-xs text-white/80 mt-0.5 leading-snug">
              下の <Share2 size={12} className="inline align-text-bottom" />{" "}
              共有ボタンから「
              <Plus size={12} className="inline align-text-bottom" />
              ホーム画面に追加」を選ぶと、アプリのように使えます。
            </p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 inset-x-3 z-[2500] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-3 md:max-w-md md:mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-400 text-slate-900 inline-flex items-center justify-center font-bold">
          <Download size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold">アプリとして使う</div>
          <p className="text-xs text-white/80 mt-0.5">
            ホーム画面に追加でフルスクリーン起動できます。
          </p>
        </div>
        <button
          onClick={install}
          className="shrink-0 inline-flex items-center justify-center h-10 px-3 rounded-lg bg-amber-400 text-amber-900 text-sm font-bold active:bg-amber-500"
        >
          追加
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10"
          aria-label="閉じる"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
