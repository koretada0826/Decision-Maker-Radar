import { cn } from "@/lib/utils";
import { rankColor } from "@/lib/labels";
import type { Rank } from "@/lib/supabase/types";

export function RankBadge({ rank, large = false }: { rank: Rank; large?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-bold tabular-nums shrink-0",
        rankColor[rank],
        large ? "w-12 h-12 text-2xl" : "w-9 h-9 text-base",
      )}
    >
      {rank}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "danger" | "info" | "success";
  className?: string;
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 border border-slate-200",
    warn: "bg-white text-amber-800 border border-amber-300",
    danger: "bg-white text-red-700 border border-red-300",
    info: "bg-sky-50 text-sky-800 border border-sky-200",
    success: "bg-white text-emerald-700 border border-emerald-300",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
