// components/component/trends/AverageItemRankListClient.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RankingItem from "./RankingItem";
import CommentSection from "./CommentSection";
import { useBordaItemRank, BordaRank } from "@/components/hooks/useTrends";

interface Props {
  subject: string
}

export default function AverageItemRankListClient({ subject }: Props) {
  const [tab, setTab] = useState<'ranking' | 'comments'>('ranking')
  const [selectedItemName, setSelectedItemName] = useState<string>('')
  const { bordaItems, isLoading, isError } = useBordaItemRank(subject)

  if (isLoading) return <p>Loading…</p>
  if (isError) return <p className="text-red-500">Error: {(isError as Error).message}</p>

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 w-full">
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
          <TabsTrigger value="comments">コメント</TabsTrigger>
        </TabsList>

        {/* ランキング */}
        <TabsContent value="ranking" className="space-y-4">
          {bordaItems.map((item: BordaRank, idx: number) => (
            <div key={item.itemName}>
              <RankingItem item={item} rank={idx + 1} />
              <button
                className="text-sm text-blue-500"
                onClick={() => {
                  setSelectedItemName(item.itemName)
                  setTab('comments')
                }}
              >
                このアイテムのコメントを見る
              </button>
            </div>
          ))}
        </TabsContent>

        {/* コメント */}
        <TabsContent value="comments" className="space-y-4">
          {selectedItemName ? (
            <CommentSection subject={subject} itemName={selectedItemName} />
          ) : (
            <p>コメントするアイテムを選択してください。</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}