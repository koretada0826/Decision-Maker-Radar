-- =====================================================================
-- デモシード（架空データ・実在企業や住所は使わない）
-- - 1) デモ組織を作成
-- - 2) auth.users に test ユーザーを作成（Supabase ダッシュボードで作る場合はこの部分は飛ばしてOK）
-- - 3) ROI 設定の初期値
-- - 4) 架空の companies 30件 + call_signals
--
-- 使い方:
--   - Supabase の SQL Editor で本ファイルを実行
--   - もしくは psql で接続して \i seed.sql
-- =====================================================================

-- ====== 1. デモ組織 ======
insert into public.organizations (id, name, plan)
values ('00000000-0000-0000-0000-000000000001', '株式会社デモ営業', 'standard')
on conflict (id) do nothing;

-- ====== 2. ROI 初期設定 ======
insert into public.roi_settings (organization_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (organization_id) do nothing;

-- ====== 3. デモ企業 30件 ======
-- すべて架空。dedupe_key は (company_name||phone||address) の lower で生成。
with raw(company_name, address, prefecture, city, ward, nearest_station, industry, phone) as (
values
  ('架空フーズ食堂','東京都新宿区サンプル町1-1','東京都','新宿区','新宿区','新宿三丁目','飲食店','03-1000-0001'),
  ('テスト美容室ルミナス','東京都渋谷区サンプル町2-2','東京都','渋谷区','渋谷区','渋谷','美容室','03-1000-0002'),
  ('架空不動産ホールディングス','東京都港区サンプル町3-3','東京都','港区','港区','六本木','不動産','03-1000-0003'),
  ('サンプル建設工業','東京都豊島区サンプル町4-4','東京都','豊島区','豊島区','池袋','建設会社','03-1000-0004'),
  ('テスト税理士事務所','東京都台東区サンプル町5-5','東京都','台東区','台東区','上野','士業事務所','03-1000-0005'),
  ('架空クリニック内科','東京都中央区サンプル町6-6','東京都','中央区','中央区','銀座','クリニック','03-1000-0006'),
  ('サンプル介護センター','東京都千代田区サンプル町7-7','東京都','千代田区','千代田区','神田','介護施設','03-1000-0007'),
  ('テストショップ雑貨','東京都新宿区サンプル町8-8','東京都','新宿区','新宿区','西新宿','小売店','03-1000-0008'),
  ('架空テックラボ','東京都渋谷区サンプル町9-9','東京都','渋谷区','渋谷区','恵比寿','IT企業','03-1000-0009'),
  ('サンプル広告社','東京都港区サンプル町10-10','東京都','港区','港区','麻布十番','広告代理店','03-1000-0010'),
  ('架空居酒屋まんぷく','東京都豊島区サンプル町11-11','東京都','豊島区','豊島区','大塚','飲食店','03-1000-0011'),
  ('テストヘアサロン','東京都台東区サンプル町12-12','東京都','台東区','台東区','浅草','美容室','03-1000-0012'),
  ('架空ビル管理','東京都中央区サンプル町13-13','東京都','中央区','中央区','日本橋','不動産','03-1000-0013'),
  ('サンプル住建','東京都千代田区サンプル町14-14','東京都','千代田区','千代田区','秋葉原','建設会社','03-1000-0014'),
  ('架空司法書士事務所','東京都新宿区サンプル町15-15','東京都','新宿区','新宿区','高田馬場','士業事務所','03-1000-0015'),
  ('テスト歯科クリニック','東京都渋谷区サンプル町16-16','東京都','渋谷区','渋谷区','原宿','クリニック','03-1000-0016'),
  ('架空デイサービス','東京都港区サンプル町17-17','東京都','港区','港区','品川','介護施設','03-1000-0017'),
  ('サンプル衣料品店','東京都豊島区サンプル町18-18','東京都','豊島区','豊島区','巣鴨','小売店','03-1000-0018'),
  ('架空ソフトウェア開発','東京都台東区サンプル町19-19','東京都','台東区','台東区','御徒町','IT企業','03-1000-0019'),
  ('テストプロモーション','東京都中央区サンプル町20-20','東京都','中央区','中央区','築地','広告代理店','03-1000-0020'),
  ('架空カフェドリーム','東京都千代田区サンプル町21-21','東京都','千代田区','千代田区','東京','飲食店','03-1000-0021'),
  ('サンプルネイルサロン','東京都新宿区サンプル町22-22','東京都','新宿区','新宿区','四ツ谷','美容室','03-1000-0022'),
  ('架空仲介サービス','東京都渋谷区サンプル町23-23','東京都','渋谷区','渋谷区','代々木','不動産','03-1000-0023'),
  ('テスト工務店','東京都港区サンプル町24-24','東京都','港区','港区','白金','建設会社','03-1000-0024'),
  ('架空社会保険労務士','東京都豊島区サンプル町25-25','東京都','豊島区','豊島区','目白','士業事務所','03-1000-0025'),
  ('サンプル小児科クリニック','東京都台東区サンプル町26-26','東京都','台東区','台東区','入谷','クリニック','03-1000-0026'),
  ('架空ケアステーション','東京都中央区サンプル町27-27','東京都','中央区','中央区','勝どき','介護施設','03-1000-0027'),
  ('テスト書店','東京都千代田区サンプル町28-28','東京都','千代田区','千代田区','水道橋','小売店','03-1000-0028'),
  ('架空Web制作スタジオ','東京都新宿区サンプル町29-29','東京都','新宿区','新宿区','新大久保','IT企業','03-1000-0029'),
  ('サンプルマーケティング','東京都渋谷区サンプル町30-30','東京都','渋谷区','渋谷区','表参道','広告代理店','03-1000-0030')
)
insert into public.companies (
  organization_id, company_name, address, prefecture, city, ward, nearest_station, industry, phone, source, dedupe_key
)
select
  '00000000-0000-0000-0000-000000000001',
  company_name, address, prefecture, city, ward, nearest_station, industry, phone,
  'demo_seed',
  md5(lower(company_name) || coalesce(phone,'') || coalesce(address,''))
from raw
on conflict (organization_id, dedupe_key) do nothing;

-- ====== 4. デモ call_signals ======
-- 直近30分〜数日まで時間軸を散らす。10件目以降の挙動を変化させる。
with picks as (
  select
    id,
    row_number() over (order by company_name) as rn
  from public.companies
  where organization_id = '00000000-0000-0000-0000-000000000001' and source = 'demo_seed'
)
insert into public.call_signals (
  organization_id, company_id, contact_time, contact_person_type, call_result, call_temperature, complaint_risk, memo
)
select
  '00000000-0000-0000-0000-000000000001',
  id,
  case
    when rn % 10 = 1 then now() - interval '12 minutes'
    when rn % 10 = 2 then now() - interval '28 minutes'
    when rn % 10 = 3 then now() - interval '55 minutes'
    when rn % 10 = 4 then now() - interval '2 hours'
    when rn % 10 = 5 then now() - interval '5 hours'
    when rn % 10 = 6 then now() - interval '1 day'
    when rn % 10 = 7 then now() - interval '20 minutes'
    when rn % 10 = 8 then now() - interval '40 minutes'
    when rn % 10 = 9 then now() - interval '3 hours'
    else now() - interval '8 hours'
  end as contact_time,
  case rn % 5
    when 0 then 'representative'
    when 1 then 'decision_maker'
    when 2 then 'manager'
    when 3 then 'staff'
    else 'unknown'
  end as contact_person_type,
  case rn % 6
    when 0 then 'busy'
    when 1 then 'send_material'
    when 2 then 'call_back_later'
    when 3 then 'no_budget'
    when 4 then 'already_using'
    else 'not_interested'
  end as call_result,
  case rn % 4
    when 0 then 'hot'
    when 1 then 'warm'
    when 2 then 'neutral'
    else 'cold'
  end as call_temperature,
  case
    when rn = 29 then 'high'
    when rn = 30 then 'medium'
    else 'low'
  end as complaint_risk,
  '架空デモデータ（メモ）。' as memo
from picks;

-- ====== 5. スコア再計算 ======
-- アプリ側でも計算するが、初期表示用にここで latest_score / latest_rank を埋める
with latest as (
  select distinct on (company_id) company_id, id as signal_id, contact_time,
    contact_person_type, call_result, call_temperature, complaint_risk
  from public.call_signals
  where organization_id = '00000000-0000-0000-0000-000000000001'
  order by company_id, contact_time desc
),
scored as (
  select
    l.company_id,
    l.signal_id,
    l.contact_time,
    -- person
    case l.contact_person_type
      when 'representative' then 35
      when 'decision_maker' then 30
      when 'manager' then 15
      when 'staff' then 5
      else 0 end
    +
    -- recency (minutes)
    case
      when extract(epoch from (now() - l.contact_time))/60 <= 30 then 30
      when extract(epoch from (now() - l.contact_time))/60 <= 60 then 25
      when extract(epoch from (now() - l.contact_time))/60 <= 180 then 15
      when l.contact_time::date = current_date then 5
      else 0 end
    +
    case l.call_result
      when 'busy' then 15
      when 'send_material' then 10
      when 'call_back_later' then 20
      when 'strong_rejection' then -80
      when 'complaint' then -100
      else 0 end
    +
    case l.call_temperature
      when 'hot' then 25
      when 'warm' then 15
      when 'neutral' then 5
      else 0 end
    +
    case l.complaint_risk
      when 'medium' then -25
      when 'high' then -80
      when 'blocked' then -100
      else 0 end as score
  from latest l
)
update public.companies c set
  latest_score = greatest(0, least(100, s.score)),
  latest_rank = case
    when s.score >= 80 then 'S'
    when s.score >= 60 then 'A'
    when s.score >= 40 then 'B'
    when s.score >= 20 then 'C'
    else 'D' end,
  latest_signal_id = s.signal_id,
  latest_signal_at = s.contact_time
from scored s
where c.id = s.company_id;
