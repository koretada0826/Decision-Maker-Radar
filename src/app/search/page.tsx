import type { Lead } from "@/lib/types";
import { SearchClient } from "./SearchClient";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  // 本番では Supabase から取得。MVP では空で開始し、
  // 管理者が /admin で取り込んだ CSV データだけを表示する。
  const initial: Lead[] = [];
  return <SearchClient initial={initial} />;
}
