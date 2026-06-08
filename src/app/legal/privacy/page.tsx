export const metadata = {
  title: "プライバシーポリシー | 決裁者レーダー",
};

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">
        プライバシーポリシー
      </h1>
      <p className="text-xs text-slate-500">最終更新日：2026年6月8日</p>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">1. 取得する情報</h2>
        <p>本サービスでは、以下の情報を取得します。</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>決済時にStripeへ入力されたメールアドレス</li>
          <li>購入履歴（購入したリードのID・購入日時・決済金額）</li>
          <li>アクセスログ（IPアドレス・ブラウザ情報など）</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">2. 利用目的</h2>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>本サービスの提供および購入履歴の管理</li>
          <li>別端末からの購入履歴復元機能の提供</li>
          <li>不正利用の防止およびサポート対応</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">3. 第三者提供</h2>
        <p>
          法令に基づく場合を除き、ユーザーの同意なしに第三者へ個人情報を提供することはありません。決済処理にあたっては、Stripe Inc.（米国）にメールアドレス等を提供します。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">4. 保存期間</h2>
        <p>
          購入履歴は、本サービス提供のため必要な期間保管します。退会希望の場合は下記窓口までご連絡ください。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">5. Cookie・PWA</h2>
        <p>
          本サービスでは、購入履歴の保持のためブラウザのlocalStorageを使用します。Cookieによる外部広告配信は行っていません。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold mt-4">6. お問い合わせ</h2>
        <p>個人情報に関するお問い合わせは下記までお願いいたします。</p>
        <p>メール：（運営者のお問い合わせ先メールアドレスを記載）</p>
      </section>
    </>
  );
}
