"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // 本番ビルドのみ登録（dev は HMR と相性悪い）
    if (process.env.NODE_ENV !== "production") {
      // 開発中も簡単な動作確認はしたいので一応 try
      // ただし dev で SW が壊れると再起動必須なのでスキップでも可
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
