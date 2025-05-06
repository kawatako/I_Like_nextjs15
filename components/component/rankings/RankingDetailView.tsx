// components/component/rankings/RankingDetailView.tsx
"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Heart, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { RankingListViewData } from "@/lib/types";

interface Props {
  ranking: RankingListViewData;
  isOwner: boolean;
}

export function RankingDetailView({ ranking, isOwner }: Props) {
  const [tab, setTab] = useState<string>("ranking");

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* 説明 */}
      {ranking.description && (
        <p className="mb-6 text-muted-foreground">{ranking.description}</p>
      )}

      {/* エンゲージメント */}
      <div className="flex gap-4 mb-8 items-center">
        <Heart className="h-5 w-5" /> <span>{ranking.likeCount}</span>
        <MessageCircle className="h-5 w-5" /> <span>—</span>
        <Share2 className="h-5 w-5" />
      </div>

      {/* タブ */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
          <TabsTrigger value="comments">コメント（未実装）</TabsTrigger>
        </TabsList>

        {/* ランキングタブ */}
        <TabsContent value="ranking">
          <div className="space-y-4">
            {ranking.items.map((item) => (
              <Card key={item.id} className="rounded-lg shadow-md overflow-hidden">
                <CardContent className="flex items-center p-4">
                  {/* ①🏆＋順位 */}
                  <div className="flex items-center justify-center w-12">
                    <Trophy
                      className={`h-6 w-6 ${
                        item.rank === 1
                          ? "text-yellow-500"
                          : item.rank === 2
                          ? "text-gray-400"
                          : item.rank === 3
                          ? "text-amber-600"
                          : "text-gray-500"
                      }`}
                    />
                    <span className="ml-1 font-bold">{item.rank}</span>
                  </div>

                  {/* ②アイテム画像エリア（画像がなくてもスペースは確保） */}
                  <div className="relative w-16 h-16 mx-4 flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.itemName}
                        fill
                        className="object-cover rounded"
                      />
                    ) : (
                      /* 何も表示しないか、グレーのプレースホルダーにする */
                      <div className="w-full h-full bg-gray-100 rounded" />
                    )}
                  </div>

                  {/* ③タイトル＋説明 */}
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.itemName}</h4>
                    {item.itemDescription && (
                      <p className="text-sm text-muted-foreground">
                        {item.itemDescription}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* タグ */}
          {ranking.tags.length > 0 && (
            <div className="mt-8">
              <h3 className="font-medium mb-2">タグ</h3>
              <div className="flex flex-wrap gap-2">
                {ranking.tags.map((t) => (
                  <Badge key={t.id} variant="outline">
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* コメントタブ */}
        <TabsContent value="comments">
          <p className="text-muted-foreground">コメント機能は未実装です。</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
