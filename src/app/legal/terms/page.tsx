export const metadata = {
  title: "利用規約 | 決裁者レーダー",
};

export default function TermsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">利用規約</h1>
      <p className="text-xs text-slate-500">最終更新日：2026年6月8日</p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">第1条（適用）</h2>
        <p>
          本規約は、決裁者レーダー（以下「本サービス」）の提供条件および本サービスの利用に関する当社（運営者）とユーザーとの間の権利義務関係を定めるものです。本サービスを利用することにより、ユーザーは本規約に同意したものとみなされます。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">第2条（サービス内容）</h2>
        <p>
          本サービスは、テレアポで決裁者・代表者と接触した顧客リードの情報を、訪問営業向けに有料で提供するものです。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">第3条（料金および支払方法）</h2>
        <p>
          リード情報の解放には、1件あたり以下の料金が発生します（消費税込み）。
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>プラチナ（接触から60分以内）：1,000円</li>
          <li>エメラルド（接触から3時間以内）：600円</li>
          <li>シルバー（接触から3時間超）：200円</li>
          <li>同一企業を再購入する場合：500円</li>
        </ul>
        <p>支払いはクレジットカード決済（Stripe）のみとなります。</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">第4条（返金・キャンセル）</h2>
        <p>
          リード情報の性質上、購入後の返金・キャンセルは原則受け付けません。ただし、明らかにデータが事実と異なる場合は、購入から7日以内にご連絡いただければ個別に対応します。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">第5条（禁止事項）</h2>
        <p>ユーザーは以下の行為をしてはなりません。</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>購入したリード情報を第三者に転売・譲渡する行為</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>他のユーザー、第三者、または当社に不利益・損害を与える行為</li>
          <li>法令または公序良俗に違反する行為</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">第6条（免責事項）</h2>
        <p>
          本サービスで提供するリード情報は、テレアポ時点のデータに基づくものであり、訪問時の状況や成約を保証するものではありません。本サービスの利用により生じた損害について、当社は責任を負いません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">第7条（規約の変更）</h2>
        <p>
          当社は、必要に応じて本規約を変更することがあります。変更後の規約は本ページに掲載した時点で効力を発します。
        </p>
      </section>
    </>
  );
}
