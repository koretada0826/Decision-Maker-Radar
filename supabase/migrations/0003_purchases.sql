-- =====================================================================
-- 購入履歴テーブル
-- - ログインなしで運用するため、email を identifier として使用
-- - 購入時のリードスナップショットを丸ごと保存（後で localStorage を
--   クリアされても全データを復元できるように）
-- - RLS は完全に閉じる（APIが service_role で読み書き）
-- =====================================================================

create extension if not exists "citext";

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  lead_id text not null,

  -- リードのスナップショット（購入時点のデータを保存）
  company_name text not null,
  address text,
  ward text,
  industry text,
  phone text,
  memo text,
  rank text,
  score int,
  contact_time timestamptz,
  contact_person_type text,
  call_result text,

  -- Stripe決済情報
  stripe_session_id text,
  stripe_payment_intent text,
  amount int not null default 1000,
  currency text not null default 'jpy',
  status text not null default 'completed' check (status in ('pending','completed','refunded')),

  created_at timestamptz not null default now()
);

-- 同じ session_id を複数回 webhook で受け取っても重複させない
create unique index if not exists uniq_purchases_session
  on public.purchases(stripe_session_id)
  where stripe_session_id is not null;

create index if not exists idx_purchases_email_created
  on public.purchases(email, created_at desc);

create index if not exists idx_purchases_lead
  on public.purchases(lead_id);

-- RLS：クライアントからの直接アクセス禁止。APIサーバーが service_role で操作する
alter table public.purchases enable row level security;
-- ポリシーを定義しない＝デフォルト deny で全クライアントアクセス拒否
