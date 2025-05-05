// components/component/trends/RankingItem.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AverageRank } from "@/components/hooks/useTrends"

interface Props {
  item: AverageRank & { image?: string; description?: string; details?: Record<string,string> };
  rank: number;
}

export default function RankingItem({ item, rank }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* 左側：アイコン＋順位 */}
        <div className="flex items-center justify-center w-16 bg-gray-50">
          <div className="flex flex-col items-center">
            <Trophy
              className={`h-6 w-6 ${
                rank === 1
                  ? "text-yellow-500"
                  : rank === 2
                  ? "text-gray-400"
                  : rank === 3
                  ? "text-amber-600"
                  : "text-gray-500"
              }`}
            />
            <div
              className={`font-bold text-xl ${
                rank === 1
                  ? "text-yellow-500"
                  : rank === 2
                  ? "text-gray-400"
                  : rank === 3
                  ? "text-amber-600"
                  : "text-gray-700"
              }`}
            >
              {rank}
            </div>
          </div>
        </div>

        {/* 右側：内容 */}
        <CardContent className="flex-1 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* もしアイテムに画像があれば */}
            {item.image && (
              <div className="relative w-full md:w-24 h-24 rounded-md overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.itemName}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex-1">
              <h3 className="font-bold text-lg truncate">{item.itemName}</h3>
              {/* 説明があれば */}
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              )}

              {/* 平均順位・登場回数などのメタ情報 */}
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div>
                  平均順位:{" "}
                  <span className="font-medium">
                    {item.avgRank.toFixed(2)}
                  </span>
                </div>
                <div>
                  登場回数: <span className="font-medium">{item.count}</span>
                </div>
                <div>
                  集計日:{" "}
                  {new Date(item.calculationDate).toLocaleDateString()}
                </div>
              </div>

              {/* 任意の詳細があれば */}
              {item.details && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(item.details).map(([k, v]) => (
                    <div key={k} className="flex items-center">
                      <span className="text-muted-foreground">{k}:</span>
                      <span className="ml-1 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
