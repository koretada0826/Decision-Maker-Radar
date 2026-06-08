import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800">
        <div className="px-2 h-14 flex items-center gap-1 max-w-3xl mx-auto">
          <Link
            href="/search"
            className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="戻る"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <div className="font-bold">決裁者レーダー</div>
        </div>
      </header>
      <main className="px-4 py-6 max-w-3xl mx-auto text-sm leading-relaxed text-slate-800 space-y-4">
        {children}
      </main>
      <footer className="mt-12 px-4 py-6 border-t border-slate-200 text-xs text-slate-500 max-w-3xl mx-auto flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/legal/terms" className="underline">
          利用規約
        </Link>
        <Link href="/legal/privacy" className="underline">
          プライバシーポリシー
        </Link>
        <Link href="/legal/tokutei" className="underline">
          特定商取引法に基づく表記
        </Link>
      </footer>
    </div>
  );
}
