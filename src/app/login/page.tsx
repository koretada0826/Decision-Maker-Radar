import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-brand-700">決裁者レーダー</div>
          <p className="text-sm text-slate-500 mt-2">
            代表者・決裁者まで届いた法人を、地図に。
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 text-center">
          <Link href="/search" className="inline-block text-sm text-brand-700 underline">
            ログインせずにリストを見る →
          </Link>
        </div>
      </div>
    </main>
  );
}
