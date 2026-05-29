-- =====================================================================
-- RLS ポリシー
-- - すべてのテーブルで RLS 有効化
-- - current_org_ids() / has_role() ヘルパーで判定
-- =====================================================================

-- ===== ヘルパー関数 =====
create or replace function public.current_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from public.organization_members
  where user_id = auth.uid() and status = 'active'
$$;

create or replace function public.has_role(_org uuid, _roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.organization_members
    where user_id = auth.uid()
      and organization_id = _org
      and status = 'active'
      and role = any(_roles)
  )
$$;

create or replace function public.is_rep_of(_org uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select public.has_role(_org, array['rep'])
$$;

-- ===== RLS 有効化 =====
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.organization_members enable row level security;
alter table public.companies enable row level security;
alter table public.call_signals enable row level security;
alter table public.visits enable row level security;
alter table public.visit_results enable row level security;
alter table public.do_not_visit_list enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_errors enable row level security;
alter table public.scoring_rules enable row level security;
alter table public.notification_events enable row level security;
alter table public.roi_settings enable row level security;
alter table public.audit_logs enable row level security;

-- ===== organizations =====
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select using (
  id in (select public.current_org_ids())
);
drop policy if exists org_insert on public.organizations;
create policy org_insert on public.organizations for insert with check (true);
drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update using (
  public.has_role(id, array['owner','admin'])
);

-- ===== users =====
drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users for select using (
  id = auth.uid() or id in (
    select user_id from public.organization_members
    where organization_id in (select public.current_org_ids())
  )
);
drop policy if exists users_self_insert on public.users;
create policy users_self_insert on public.users for insert with check (id = auth.uid());
drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users for update using (id = auth.uid());

-- ===== organization_members =====
drop policy if exists om_select on public.organization_members;
create policy om_select on public.organization_members for select using (
  organization_id in (select public.current_org_ids())
);
drop policy if exists om_insert on public.organization_members;
create policy om_insert on public.organization_members for insert with check (
  -- 自分を最初の owner として登録するケース、または owner/manager による招待
  user_id = auth.uid()
  or public.has_role(organization_id, array['owner','manager','admin'])
);
drop policy if exists om_update on public.organization_members;
create policy om_update on public.organization_members for update using (
  public.has_role(organization_id, array['owner','admin'])
);
drop policy if exists om_delete on public.organization_members;
create policy om_delete on public.organization_members for delete using (
  public.has_role(organization_id, array['owner','admin'])
);

-- ===== companies =====
drop policy if exists comp_select on public.companies;
create policy comp_select on public.companies for select using (
  organization_id in (select public.current_org_ids())
);
drop policy if exists comp_insert on public.companies;
create policy comp_insert on public.companies for insert with check (
  public.has_role(organization_id, array['owner','manager','admin'])
);
drop policy if exists comp_update on public.companies;
create policy comp_update on public.companies for update using (
  public.has_role(organization_id, array['owner','manager','admin'])
);
drop policy if exists comp_delete on public.companies;
create policy comp_delete on public.companies for delete using (
  public.has_role(organization_id, array['owner','admin'])
);

-- ===== call_signals =====
drop policy if exists cs_select on public.call_signals;
create policy cs_select on public.call_signals for select using (
  organization_id in (select public.current_org_ids())
);
drop policy if exists cs_insert on public.call_signals;
create policy cs_insert on public.call_signals for insert with check (
  public.has_role(organization_id, array['owner','manager','admin'])
);

-- ===== visits =====
drop policy if exists v_select on public.visits;
create policy v_select on public.visits for select using (
  organization_id in (select public.current_org_ids())
  and (
    public.has_role(organization_id, array['owner','manager','admin'])
    or rep_user_id = auth.uid()
  )
);
drop policy if exists v_insert on public.visits;
create policy v_insert on public.visits for insert with check (
  organization_id in (select public.current_org_ids())
  and rep_user_id = auth.uid()
);
drop policy if exists v_update on public.visits;
create policy v_update on public.visits for update using (
  organization_id in (select public.current_org_ids())
  and (
    public.has_role(organization_id, array['owner','manager','admin'])
    or rep_user_id = auth.uid()
  )
);

-- ===== visit_results =====
drop policy if exists vr_select on public.visit_results;
create policy vr_select on public.visit_results for select using (
  organization_id in (select public.current_org_ids())
  and (
    public.has_role(organization_id, array['owner','manager','admin'])
    or rep_user_id = auth.uid()
  )
);
drop policy if exists vr_insert on public.visit_results;
create policy vr_insert on public.visit_results for insert with check (
  organization_id in (select public.current_org_ids())
  and rep_user_id = auth.uid()
);

-- ===== do_not_visit_list =====
drop policy if exists dnv_select on public.do_not_visit_list;
create policy dnv_select on public.do_not_visit_list for select using (
  organization_id in (select public.current_org_ids())
);
drop policy if exists dnv_insert on public.do_not_visit_list;
create policy dnv_insert on public.do_not_visit_list for insert with check (
  organization_id in (select public.current_org_ids())
);
drop policy if exists dnv_update on public.do_not_visit_list;
create policy dnv_update on public.do_not_visit_list for update using (
  public.has_role(organization_id, array['owner','admin'])
);

-- ===== import_batches / import_errors =====
drop policy if exists ib_select on public.import_batches;
create policy ib_select on public.import_batches for select using (
  organization_id in (select public.current_org_ids())
);
drop policy if exists ib_insert on public.import_batches;
create policy ib_insert on public.import_batches for insert with check (
  public.has_role(organization_id, array['owner','manager','admin'])
);

drop policy if exists ie_select on public.import_errors;
create policy ie_select on public.import_errors for select using (
  organization_id in (select public.current_org_ids())
);
drop policy if exists ie_insert on public.import_errors;
create policy ie_insert on public.import_errors for insert with check (
  organization_id in (select public.current_org_ids())
);

-- ===== scoring_rules =====
drop policy if exists sr_select on public.scoring_rules;
create policy sr_select on public.scoring_rules for select using (
  organization_id is null or organization_id in (select public.current_org_ids())
);
drop policy if exists sr_upsert on public.scoring_rules;
create policy sr_upsert on public.scoring_rules for insert with check (
  organization_id is not null and public.has_role(organization_id, array['owner','admin'])
);
drop policy if exists sr_update on public.scoring_rules;
create policy sr_update on public.scoring_rules for update using (
  organization_id is not null and public.has_role(organization_id, array['owner','admin'])
);

-- ===== notification_events =====
drop policy if exists ne_select on public.notification_events;
create policy ne_select on public.notification_events for select using (
  organization_id in (select public.current_org_ids())
  and (target_user_id is null or target_user_id = auth.uid()
       or public.has_role(organization_id, array['owner','manager','admin']))
);
drop policy if exists ne_insert on public.notification_events;
create policy ne_insert on public.notification_events for insert with check (
  organization_id in (select public.current_org_ids())
);

-- ===== roi_settings =====
drop policy if exists rs_select on public.roi_settings;
create policy rs_select on public.roi_settings for select using (
  public.has_role(organization_id, array['owner','admin','manager'])
);
drop policy if exists rs_upsert on public.roi_settings;
create policy rs_upsert on public.roi_settings for insert with check (
  public.has_role(organization_id, array['owner','admin'])
);
drop policy if exists rs_update on public.roi_settings;
create policy rs_update on public.roi_settings for update using (
  public.has_role(organization_id, array['owner','admin'])
);

-- ===== audit_logs (append-only) =====
drop policy if exists al_select on public.audit_logs;
create policy al_select on public.audit_logs for select using (
  public.has_role(organization_id, array['owner','admin'])
);
drop policy if exists al_insert on public.audit_logs;
create policy al_insert on public.audit_logs for insert with check (
  organization_id in (select public.current_org_ids())
);
-- update / delete は許可しない（ポリシー作らない＝デフォルト拒否）
