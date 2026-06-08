"use client";

import { useEffect, useState } from "react";
import { Lock, LogOut } from "lucide-react";

// クライアントサイドの「カジュアル抑止」ゲート。
// ・営業マンが偶然URLを打って入ってしまう事故を防ぐのが目的
// ・本気のセキュリティが必要になったら Supabase Auth + サーバー側チェックに置き換える
// ・NEXT_PUBLIC_* は静的バンドルに含まれるため、ブラウザの devtools で見ようと思えば見える点に注意

const SESSION_KEY = "kr-admin-auth-v1";
const DEFAULT_PASSWORD = "admin-2026";

function getExpectedPassword(): string {
  const envPw = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  return envPw && envPw.length > 0 ? envPw : DEFAULT_PASSWORD;
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored === "1") setAuthed(true);
    } catch {}
    setChecked(true);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const expected = getExpectedPassword();
    if (pw === expected) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
      setAuthed(true);
      setError(null);
    } else {
      setError("パスワードが違います");
    }
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setAuthed(false);
    setPw("");
  }

  if (!checked) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-slate-500 text-sm">
        読み込み中…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <form
          onSubmit={submit}
          className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 inline-flex items-center justify-center rounded-full bg-slate-900 text-white">
              <Lock size={20} aria-hidden="true" />
            </div>
            <h1 className="font-bold text-lg text-slate-900">管理者ログイン</h1>
            <p className="text-xs text-slate-500 text-center">
              このページは管理者専用です。
              <br />
              パスワードを入力してください。
            </p>
          </div>
          <label className="block space-y-1">
            <span className="block text-sm font-medium text-slate-700">
              パスワード
            </span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="w-full h-12 px-3 rounded-xl border border-slate-300 text-base bg-white focus:outline-none"
              aria-invalid={error ? "true" : "false"}
            />
          </label>
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full h-12 rounded-lg bg-slate-900 text-white font-bold active:bg-slate-800"
          >
            ログイン
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            ※ セッション中はブラウザを閉じるまでログイン状態が続きます
          </p>
        </form>
      </div>
    );
  }

  return (
    <>
      {children}
      <button
        type="button"
        onClick={logout}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold shadow-md active:bg-slate-50"
        aria-label="管理者ログアウト"
        title="管理者ログアウト"
      >
        <LogOut size={14} aria-hidden="true" />
        ログアウト
      </button>
    </>
  );
}
