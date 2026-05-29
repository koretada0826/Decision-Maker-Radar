# 決裁者レーダー (Kessaisha Radar) — MVP

**「代表者・決裁者まで届いたが、まだアポを取れていない法人」を地図にピン留めするツール。**

CSVをアップロードすると、代表者または決裁者に到達した接触データだけが地図に表示されます。営業マンは地図を見るだけで「今日どこを攻めるべきか」が分かります。

---

## 動くもの（このMVP）

- `/map` — 地図メイン画面（OpenStreetMapタイル上に色付きピン）
- CSVアップロード → 地図に即反映（ブラウザに保存。ページ更新しても残る）
- ピンタップ → 会社名、最終接触、メモ → 「経路を開く」でGoogleマップへ
- ランクフィルター（S / A以上 / B以上 / 全て）、相手フィルター（代表＋決裁 / 代表者のみ / 決裁者のみ）
- `/login` — ログイン画面（Supabase Auth。MVPでは利用任意）

---

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:3000> を開く → `/map` に自動遷移。

スマホで実機確認するなら、同じWi-Fi上のスマホから `http://<このマシンのIP>:3000` でアクセス。

> 環境変数（`.env.local`）は **無くても動きます**。デモデータ15件が表示されます。Supabaseに繋ぐ場合は `NEXT_PUBLIC_SUPABASE_URL` 等を設定してください。

---

## CSVを試す

地図右上の「CSVを追加」ボタンから取り込みます。

サンプル：`public/sample_import.csv`

最低限必要な列：

| 列 | 値 |
|---|---|
| `company_name` | 会社名 |
| `contact_time` | `2025-05-28T13:30:00+09:00` 形式 |
| `contact_person_type` | `representative` または `decision_maker`（**この2つ以外はピンに出ない**） |

推奨列：`address`, `ward`, `industry`, `phone`, `call_result`, `call_temperature`, `memo`, `lat`, `lng`

`lat` / `lng` を渡せばそこに正確にピンが立ちます。無ければ `ward` から東京の区中心+ランダムオフセットで配置します。

---

## Google Maps APIに差し替えたい場合

現在は Leaflet + OpenStreetMap（無料・APIキー不要）。Google Maps Platform に差し替える手順：

1. Google Cloud Console でプロジェクト作成 → Maps JavaScript API を有効化
2. APIキーを発行（HTTP referrer 制限を `http://localhost:3000/*` 等に設定）
3. `npm i @googlemaps/js-api-loader`
4. `src/app/map/LeafletMap.tsx` を Google Maps JS API ベースに差し替え
5. `.env.local` に `NEXT_PUBLIC_GOOGLE_MAPS_KEY=...`

ピン・ポップアップ・経路リンクのロジックはそのまま使えます。

---

## ファイル構成（最小限）

```
src/
  app/
    map/                  # メイン地図画面
      page.tsx
      MapClient.tsx       # フィルター・状態管理
      LeafletMap.tsx      # 地図描画（クライアント側のみ読み込み）
      CsvUploadDialog.tsx # CSV取込ダイアログ
    login/                # ログイン（任意）
    page.tsx              # /map にリダイレクト
    layout.tsx
    globals.css
  components/ui/          # Button / Card / Field / Badge
  lib/
    demo/data.ts          # デモの15社（代表/決裁接触のみ）
    geo.ts                # 区→座標、ジッタ
    scoring.ts            # ホットスコア
    labels.ts             # 日本語表示
    utils.ts
    supabase/             # 将来用（任意）
    auth.ts               # 任意
public/
  sample_import.csv
```

---

## このMVPでやっていないこと（後回し）

- マネージャーダッシュボード、ROIシミュレーター、KPI集計
- 訪問結果登録、訪問ロック、訪問禁止リスト管理
- Supabaseへの実保存（CSVは現状ブラウザのlocalStorageのみ）
- Google Maps API差し替え
- スマホPush通知 / LINE / Slack
