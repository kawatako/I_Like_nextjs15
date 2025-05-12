// components/component/trends/AverageItemRankList.tsx
//trends/average/[subject]/page.tsxから受け取ったデータを表示するだけの純粋コンポーネント
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RankingItem from "./RankingItem";
import { AverageRank } from "@/components/hooks/useTrends";

interface Props {
  averageRanks: AverageRank[];
  isLoading: boolean;
  isError: any;
}

export default function AverageItemRankList({
  averageRanks,
  isLoading,
  isError,
}: Props) {
  const [tab, setTab] = useState<"ranking" | "comments">("ranking");

  if (isLoading) return <p>Loading…</p>;
  if (isError)   return <p>Error</p>;

  return (
    <div className="space-y-4">
      {/* タブ */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "ranking" | "comments")}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
          <TabsTrigger value="comments">コメント</TabsTrigger>
        </TabsList>
        {/* ランキング表示 */}
        <TabsContent value="ranking" className="space-y-4">
          {averageRanks.map((item, idx) => (
            <RankingItem key={idx} item={item} rank={idx + 1} />
          ))}
        </TabsContent>
        {/* コメントダミー */}
        <TabsContent value="comments" className="space-y-2 px-2">
          <p>コメント機能は未実装です。</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
