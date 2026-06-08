export const metadata = {
  title: "特定商取引法に基づく表記 | 決裁者レーダー",
};

export default function TokuteiPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">
        特定商取引法に基づく表記
      </h1>

      <dl className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-y-3 gap-x-4 mt-4">
        <dt className="font-bold text-slate-700">販売事業者</dt>
        <dd>（運営者名／屋号を記載）</dd>

        <dt className="font-bold text-slate-700">運営責任者</dt>
        <dd>（責任者氏名を記載）</dd>

        <dt className="font-bold text-slate-700">所在地</dt>
        <dd>
          請求があれば遅滞なく開示します。
          <br />
          メールにてお問い合わせください。
        </dd>

        <dt className="font-bold text-slate-700">電話番号</dt>
        <dd>
          請求があれば遅滞なく開示します。
          <br />
          メールにてお問い合わせください。
        </dd>

        <dt className="font-bold text-slate-700">メールアドレス</dt>
        <dd>（お問い合わせ用メールアドレスを記載）</dd>

        <dt className="font-bold text-slate-700">販売価格</dt>
        <dd>各リード情報のページに表示する金額（消費税込み）</dd>

        <dt className="font-bold text-slate-700">商品代金以外の必要料金</dt>
        <dd>インターネット接続料・通信料はお客様のご負担となります。</dd>

        <dt className="font-bold text-slate-700">支払方法</dt>
        <dd>クレジットカード決済（Stripe）</dd>

        <dt className="font-bold text-slate-700">支払時期</dt>
        <dd>商品購入時（即時決済）</dd>

        <dt className="font-bold text-slate-700">商品の引渡時期</dt>
        <dd>
          決済完了後、即時にリード詳細情報（住所・電話番号・メモ）が解放されます。
        </dd>

        <dt className="font-bold text-slate-700">返品・キャンセル</dt>
        <dd>
          デジタルコンテンツの性質上、購入後の返品・キャンセルは原則お受けできません。データに明らかな誤りがある場合は、購入から7日以内にご連絡ください。
        </dd>

        <dt className="font-bold text-slate-700">動作環境</dt>
        <dd>
          最新版のSafari／Chrome／Edge等のモダンブラウザ。iOS／Androidいずれもサポート。
        </dd>
      </dl>

      <p className="text-xs text-slate-500 mt-6">
        ※ 本ページは特定商取引法第11条に基づき表示しています。
      </p>
    </>
  );
}
