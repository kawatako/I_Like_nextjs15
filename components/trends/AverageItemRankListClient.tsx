// components/trends/AverageItemRankListClient.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RankingItem from "./RankingItem";
import CommentSection from "./CommentSection";
import { useBordaItemRank } from "@/lib/hooks/useTrends";

interface Props {
  subject: string
}

export default function AverageItemRankListClient({ subject }: Props) {
  const [tab, setTab] = useState<"ranking"|"comments">("ranking")
  const { bordaItems, isLoading, isError } = useBordaItemRank(subject)

  if (isLoading) return <p>Loading…</p>
  if (isError)   return <p className="text-red-500">Error</p>

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 w-full">
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
          <TabsTrigger value="comments">コメント</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-4">
          {bordaItems.map((item, idx) => (
            <RankingItem key={item.itemName} item={item} rank={idx+1} />
          ))}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <CommentSection subject={subject} />
        </TabsContent>
      </Tabs>
    </div>
  )
}