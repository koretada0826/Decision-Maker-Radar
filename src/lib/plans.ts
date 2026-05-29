export type Plan = {
  id: "starter" | "standard" | "pro";
  name: string;
  leads: number;
  price: number; // 円
  description: string;
  recommended?: boolean;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "スターター",
    leads: 50,
    price: 5000,
    description: "個人事業主・小規模チーム向け",
    features: [
      "決裁者まで到達した法人リスト 50件",
      "東京エリア指定可能",
      "Googleマップ起動・住所コピー",
      "CSVでまとめてダウンロード",
    ],
  },
  {
    id: "standard",
    name: "スタンダード",
    leads: 200,
    price: 18000,
    description: "中堅営業チーム向け（人気）",
    recommended: true,
    features: [
      "決裁者まで到達した法人リスト 200件",
      "全エリア・全業種から選択",
      "S/Aランク優先表示",
      "営業マンへの共有リンク生成",
      "メールサポート",
    ],
  },
  {
    id: "pro",
    name: "プロ",
    leads: 1000,
    price: 80000,
    description: "大規模営業組織向け",
    features: [
      "決裁者まで到達した法人リスト 1,000件",
      "条件指定リクエスト対応",
      "S/A限定オプション",
      "営業マン無制限共有",
      "電話サポート",
    ],
  },
];

export function findPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
