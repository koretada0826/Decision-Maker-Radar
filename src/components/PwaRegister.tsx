"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // 開発時：SWを登録しない＋既存SWを自動で剥がす
    // 理由：dev中にSWがHTML/JSをキャッシュすると、コード変更が反映されない事故が頻発する
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) r.unregister();
      });
      // キャッシュも一掃
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const k of keys) caches.delete(k);
        });
      }
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((e) => console.warn("SW register failed:", e));
    };
    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }
  }, []);
  return null;
}
