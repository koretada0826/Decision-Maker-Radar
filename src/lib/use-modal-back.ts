"use client";

import { useEffect } from "react";

// モーダル open 時に history に1個 push し、popstate（Android戻る / iOSスワイプバック）で onClose を呼ぶ。
// これにより「戻るボタン → モーダルを閉じる（ページから離脱しない）」が成立する。
export function useModalBackButton(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    // 既に同じ state が積まれているか判定するため、ユニークなマーカーを使う
    const marker = { __kr_modal: true, t: Date.now() };
    window.history.pushState(marker, "");

    function onPop() {
      onClose();
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // 閉じる時に push した state を消す（戻るボタン以外で閉じた時の補正）
      // 既に popstate で1段戻っていれば go(-1) はスルーされる、安全に呼べる
      try {
        if (window.history.state && (window.history.state as { __kr_modal?: boolean }).__kr_modal) {
          window.history.back();
        }
      } catch {}
    };
  }, [open, onClose]);
}
