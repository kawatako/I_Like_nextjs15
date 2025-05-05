// app/trends/average/[subject]/page.tsx
"use client"

import { useParams } from "next/navigation"
import AverageItemRankList from "@/components/component/trends/AverageItemRankList"
import { useAverageItemRank } from "@/components/hooks/useTrends"

export default function SubjectAveragePage() {
  const params = useParams()
  // useParams().subject は string | string[] なので
  const subjectParam = Array.isArray(params.subject)
    ? params.subject[0]
    : params.subject
  const subject = decodeURIComponent(subjectParam || "")

  const { averageRanks, isLoading, isError } = useAverageItemRank(subject)

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        「{subject}」の平均順位
      </h1>
      <AverageItemRankList
        averageRanks={averageRanks}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  )
}
