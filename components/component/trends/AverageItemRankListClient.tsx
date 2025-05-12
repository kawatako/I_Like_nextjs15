// components/component/trends/AverageItemRankListClient.tsx
"use client"

import { useState } from "react"
import useSWR from "swr"
import { supabase } from "@/lib/supabaseClient"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import RankingItem from "./RankingItem"

/** 平均順位の型 */
export interface AverageRank {
  itemName: string
  avgRank: number
  count: number
  calculationDate: string
}

interface AverageItemRankListClientProps {
  subject: string
}

/**
 * クライアントコンポーネント
 * useSWR で平均順位データを取得し、タブ切り替え UI を提供します。
 */
export default function AverageItemRankListClient({ subject }: AverageItemRankListClientProps) {
  const [tab, setTab] = useState<"ranking" | "comments">("ranking")

  const key = ["average-item-rank", subject] as const
  const fetcher = async (): Promise<AverageRank[]> => {
    const { data, error } = await supabase
      .from("AverageItemRank")
      .select("itemName,avgRank,count,calculationDate")
      .eq("subject", subject)
      .order("avgRank", { ascending: true })
      .limit(10)
    if (error) throw error
    return data
  }

  const { data, error, isLoading } = useSWR<AverageRank[]>(key, fetcher)
  const averageRanks = data ?? []

  const dummyComments = [
    { user: "ユーザーA", text: "この集計、とても参考になります！" },
    { user: "ユーザーB", text: "Item X の順位が思ったより高い…" },
    { user: "ユーザーC", text: "全期間での平均だけでなく、期間別も見たいです。" },
  ]

  if (isLoading) return <p>Loading…</p>
  if (error) return <p className="text-red-500">Error: {error.message}</p>

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "ranking" | "comments")}
        className="w-full"
      >
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
  )
}
