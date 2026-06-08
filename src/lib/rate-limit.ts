// シンプルな in-memory レート制限
// 本格運用には Upstash Redis / Vercel KV 等を使うべきだが、
// Render の単一インスタンス運用なら in-memory で実用範囲。

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1分
const MAX_PER_WINDOW = 20; // 1メアド・1分あたり20リクエストまで

export function checkRateLimit(
  key: string,
  max: number = MAX_PER_WINDOW,
  windowMs: number = WINDOW_MS,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const reset = now + windowMs;
    buckets.set(key, { count: 1, resetAt: reset });
    return { ok: true, remaining: max - 1, resetAt: reset };
  }
  if (b.count >= max) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: max - b.count, resetAt: b.resetAt };
}

// 古いバケットを定期的にクリーンアップ（メモリリーク防止）
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets.entries()) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }, 5 * 60_000);
}
