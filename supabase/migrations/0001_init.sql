-- =====================================================================
-- 決裁者レーダー (Kessaisha Radar) MVP schema
-- - すべてのテーブルに organization_id を持たせ RLS でフル分離
-- - 監査ログ append-only / do_not_visit はハードカット用途
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- ENUM ライクな型は text + check 制約で柔軟に保持（将来追加しやすい）
-- ---------------------------------------------------------------------

-- ===== organizations =====
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== users (auth.users と 1:1) =====
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== organization_members =====
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','rep','admin')),
  status text not null default 'active' check (status in ('active','invited','disabled')),
  invited_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists idx_org_members_user on public.organization_members(user_id);

-- ===== companies =====
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null,
  address text,
  prefecture text,
  city text,
  ward text,
  nearest_station text,
  industry text,
  phone text,
  website_url text,
  source text,
  external_id text,
  dedupe_key text not null,
  visit_allowed boolean not null default true,
  latest_score int not null default 0,
  latest_rank text not null default 'D' check (latest_rank in ('S','A','B','C','D')),
  latest_signal_at timestamptz,
  latest_signal_id uuid,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dedupe_key)
);
create index if not exists idx_companies_org_rank on public.companies(organization_id, latest_rank, latest_signal_at desc);
create index if not exists idx_companies_org_ward on public.companies(organization_id, ward);

-- ===== call_signals =====
create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_time timestamptz not null,
  contact_person_type text not null check (contact_person_type in ('representative','decision_maker','manager','staff','unknown')),
  call_result text not null check (call_result in ('not_interested','busy','send_material','call_back_later','no_budget','already_using','strong_rejection','complaint','other')),
  call_temperature text not null check (call_temperature in ('hot','warm','neutral','cold','danger')),
  complaint_risk text not null default 'low' check (complaint_risk in ('low','medium','high','blocked')),
  memo text,
  import_batch_id uuid,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_call_signals_company on public.call_signals(company_id, contact_time desc);
create index if not exists idx_call_signals_org_time on public.call_signals(organization_id, contact_time desc);

-- ===== visits (訪問アクション本体) =====
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  rep_user_id uuid not null references public.users(id),
  status text not null default 'visiting' check (status in ('visiting','visited','canceled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 1企業に対して同時にアクティブな訪問は1つだけ（重複訪問防止）
create unique index if not exists uniq_visit_active_per_company on public.visits(company_id) where status = 'visiting';
create index if not exists idx_visits_org_rep on public.visits(organization_id, rep_user_id, started_at desc);
create index if not exists idx_visits_org_started on public.visits(organization_id, started_at desc);

-- ===== visit_results =====
create table if not exists public.visit_results (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null unique references public.visits(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  rep_user_id uuid not null references public.users(id),
  result text not null check (result in ('absent','receptionist_ng','met_staff','met_decision_maker','met_representative','appointment_set','contract_likely','complaint','do_not_visit','other')),
  memo text,
  next_action text,
  next_visit_date date,
  appointment_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_visit_results_org_created on public.visit_results(organization_id, created_at desc);

-- ===== do_not_visit_list =====
create table if not exists public.do_not_visit_list (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  reason text,
  source text not null check (source in ('csv','visit_result','manual')),
  created_by uuid references public.users(id),
  released_by uuid references public.users(id),
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists uniq_dnv_active on public.do_not_visit_list(organization_id, company_id) where released_at is null;

-- ===== import_batches / import_errors =====
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid references public.users(id),
  filename text,
  total_rows int not null default 0,
  imported int not null default 0,
  duplicates int not null default 0,
  excluded int not null default 0,
  errors int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  row_number int not null,
  message text not null,
  raw jsonb,
  created_at timestamptz not null default now()
);

-- ===== scoring_rules =====
create table if not exists public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  key text not null,
  value int not null,
  enabled boolean not null default true,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);

-- ===== notification_events =====
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  target_user_id uuid references public.users(id),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_org_created on public.notification_events(organization_id, created_at desc);

-- ===== roi_settings =====
create table if not exists public.roi_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  rep_count int not null default 5,
  monthly_visits_per_rep int not null default 120,
  monthly_salary int not null default 350000,
  fully_loaded_cost int not null default 525000,
  baseline_appt_rate numeric(5,4) not null default 0.02,
  service_appt_rate numeric(5,4) not null default 0.035,
  close_rate numeric(5,4) not null default 0.20,
  gross_profit_per_deal int not null default 300000,
  saas_monthly_fee int not null default 100000,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ===== audit_logs (append-only) =====
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.users(id),
  action text not null,
  target_table text,
  target_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_org_created on public.audit_logs(organization_id, created_at desc);

-- =====================================================================
-- 更新時刻トリガー
-- =====================================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array['organizations','users','organization_members','companies','visits','roi_settings']) loop
    execute format('drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.tg_set_updated_at();', t, t);
  end loop;
end $$;
