// components/component/trends/AverageItemRankList.tsx
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

  const dummyComments = [
    { user: "ユーザーA", text: "この集計、とても参考になります！" },
    { user: "ユーザーB", text: "Item X の順位が思ったより高い…" },
    {
      user: "ユーザーC",
      text: "全期間での平均だけでなく、期間別も見たいです。",
    },
  ];

  if (isLoading) return <p>Loading…</p>;
  if (isError) return <p>Error</p>;

  return (
    <div className='space-y-4'>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "ranking" | "comments")}
        className='w-full'
      >
        <TabsList className='w-full grid grid-cols-2 mb-4'>
          <TabsTrigger value='ranking'>ランキング</TabsTrigger>
          <TabsTrigger value='comments'>コメント</TabsTrigger>
        </TabsList>

        {/* ランキングタブ */}
        <TabsContent value='ranking' className='space-y-4'>
          <div className='space-y-4'>
            {averageRanks.map((item, idx) => (
              <RankingItem key={idx} item={item} rank={idx + 1} />
            ))}
          </div>
        </TabsContent>

        {/* コメントタブ */}
        <TabsContent value='comments' className='space-y-2 px-2'>
          {dummyComments.map((c, idx) => (
            <div key={idx} className='text-sm'>
              <strong>{c.user}</strong>: {c.text}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
