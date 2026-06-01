-- 購入履歴に dedup_key 列を追加
-- これでメアド × 会社の組合せで重複購入を瞬時にチェック可能になる

alter table public.purchases
  add column if not exists dedup_key text;

create index if not exists idx_purchases_email_dedup
  on public.purchases(email, dedup_key)
  where dedup_key is not null;
