-- =====================================================================
-- リード（CSV取り込み）テーブル
-- - 管理者が取り込んだCSVをサーバー側に保存し、営業担当の端末に共有する
-- - クライアントから直接書かない（service_role 経由のみ）
-- - 同じ dedup_key の最新だけ残す upsert 方針
-- =====================================================================

create table if not exists public.leads (
  id text primary key,
  dedup_key text,
  company_name text not null,
  address text,
  ward text,
  industry text,
  size text,
  phone text,
  memo text,
  rank text,
  score int,
  contact_time timestamptz,
  contact_person_type text,
  call_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_dedup on public.leads(dedup_key) where dedup_key is not null;
create index if not exists idx_leads_contact_time on public.leads(contact_time desc);
create index if not exists idx_leads_ward on public.leads(ward);
create index if not exists idx_leads_industry on public.leads(industry);

-- 全クライアント直接アクセス拒否（RLS）。service_role 経由のみ。
alter table public.leads enable row level security;

-- 同 dedup_key の重複防止 partial unique index
create unique index if not exists uniq_leads_dedup_key
  on public.leads(dedup_key)
  where dedup_key is not null;

-- 購入の dedup_key (email, dedup_key) ユニーク制約を追加（二重課金防止）
create unique index if not exists uniq_purchases_email_dedup
  on public.purchases(email, dedup_key)
  where dedup_key is not null;
