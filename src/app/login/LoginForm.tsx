"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createSupabaseBrowser();
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("メールに届いたログインリンクをタップしてください。");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("確認メールを送信しました。リンクを開いて続行してください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = "/search";
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-sm">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 h-9 rounded-lg ${mode === "signin" ? "bg-white shadow font-semibold" : "text-slate-600"}`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 h-9 rounded-lg ${mode === "signup" ? "bg-white shadow font-semibold" : "text-slate-600"}`}
          >
            新規登録
          </button>
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={`flex-1 h-9 rounded-lg ${mode === "magic" ? "bg-white shadow font-semibold" : "text-slate-600"}`}
          >
            メールリンク
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="メールアドレス">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
          {mode !== "magic" && (
            <Field label="パスワード">
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </Field>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
          )}
          {message && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2">
              {message}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading
              ? "処理中..."
              : mode === "signup"
                ? "新規登録"
                : mode === "magic"
                  ? "ログインリンクを送る"
                  : "ログイン"}
          </Button>
        </form>

        <p className="text-xs text-slate-500 text-center">
          ログインすると利用規約・プライバシーポリシーに同意したものとみなします。
        </p>
      </CardBody>
    </Card>
  );
}
