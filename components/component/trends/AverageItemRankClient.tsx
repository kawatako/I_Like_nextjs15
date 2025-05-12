//app/components/component/trends/AverageItemRankClient.tsx
//SWR と useAverageItemRank フックを使ってデータをフェッチし、タブ切り替えやローディング／エラー表示を担う

"use client";

import { useAverageItemRank } from "@/components/hooks/useTrends";
import AverageItemRankList from "@/components/component/trends/AverageItemRankList";

interface Props {
  subject: string;
}

export default function AverageItemRankClient({ subject }: Props) {
  const { averageRanks, isLoading, isError } = useAverageItemRank(subject);

  return (
    <AverageItemRankList
      averageRanks={averageRanks}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
