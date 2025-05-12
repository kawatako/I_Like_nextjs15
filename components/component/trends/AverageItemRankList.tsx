// components/component/trends/AverageItemRankList.tsx
//AverageItemRankListClientから受け取ったデータを表示するだけの純粋コンポーネント
import ClientOnly from "@/components/component/common/ClientOnly";
import AverageItemRankListClient from "@/components/component/trends/AverageItemRankListClient";

interface Props {
  subject: string;
}

export default function AverageItemRankList({ subject }: Props) {
  return (
    <ClientOnly>
      <AverageItemRankListClient subject={subject} />
    </ClientOnly>
  );
}
