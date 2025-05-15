// components/component/trends/AverageItemRankListClient.tsx
"use client";

import { useState } from "react";
import { useBordaItemRank } from "@/components/hooks/useTrends"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RankingItem from "./RankingItem";

/** ボルダスコアの型 */
export interface AverageRank {
  itemName: string;
  avgRank: number;      // ボルダスコアを格納
  count: number;        // 出現回数
  calculationDate: string;
}

interface AverageItemRankListClientProps {
  subject: string;
}

export default function AverageItemRankListClient({ subject }: { subject: string }) {
  const [tab, setTab] = useState<"ranking" | "comments">("ranking")
  const { averageRanks, isLoading, isError } = useBordaItemRank(subject)
 
  const dummyComments = [
    { user: "ユーザーA", text: "この集計、とても参考になります！" },
    { user: "ユーザーB", text: "Item X のスコアが思ったより高い…" },
    { user: "ユーザーC", text: "全期間でのボルダスコアも見たいです。" },
  ];

  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p className="text-red-500">Error: {isError.message}</p>;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "ranking" | "comments")} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 w-full">
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
          <TabsTrigger value="comments">コメント</TabsTrigger>
        </TabsList>

        {/* ランキング表示 */}
        <TabsContent value="ranking" className="space-y-4">
          {averageRanks.map((item, idx) => (
            <RankingItem key={idx} item={item} rank={idx + 1} />
          ))}
        </TabsContent>

        {/* コメント表示 */}
        <TabsContent value="comments" className="space-y-2 px-2">
          {dummyComments.map((c, idx) => (
            <div key={idx} className="text-sm">
              <strong>{c.user}</strong>: {c.text}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
