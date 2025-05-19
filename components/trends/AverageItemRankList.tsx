// components/trends/AverageItemRankList.tsx
//AverageItemRankListClientから受け取ったデータを表示するだけの純粋コンポーネント
import ClientOnly from "@/components/common/ClientOnly";
import AverageItemRankListClient from "@/components/trends/AverageItemRankListClient";

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
