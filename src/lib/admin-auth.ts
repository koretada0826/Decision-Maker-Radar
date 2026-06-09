// 管理API用の簡易トークン認可
// 環境変数 ADMIN_API_TOKEN に設定された秘密文字列を、
// クライアント（admin画面）からは NEXT_PUBLIC_ADMIN_API_TOKEN として送る。
// Bearer 形式で Authorization ヘッダに入れる。

export function isAdminAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_API_TOKEN ?? "";
  // 未設定時はガード無効（dev環境想定）
  if (!expected) return true;
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : "";
  return token === expected;
}
