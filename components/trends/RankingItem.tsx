// components/trends/RankingItem.tsx
//AverageItemRankListClientから渡された item をそのまま描画する純粋表示コンポーネンと
"use client";

import React from "react";
import { Trophy } from "@/components/Icons";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  item: {
    itemName: string;
    avgRank: number;
    count: number;
    calculationDate: string;
    image?: string;
    description?: string;
    details?: Record<string, string>;
  };
  rank: number;
}

export default function RankingItem({ item, rank }: Props) {
  return (
    <Card className='overflow-hidden'>
      <div className='flex'>
        {/* 左側：アイコン＋順位 */}
        <div className='flex items-center justify-center w-16 bg-gray-50'>
          <div className='flex flex-col items-center'>
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
        <CardContent className='flex-1 p-4'>
          <div className='flex flex-col md:flex-row md:items-center gap-4'>
            <div className='flex-1'>
              <h3 className='font-bold text-lg truncate'>{item.itemName}</h3>
              {item.description && (
                <p className='text-sm text-muted-foreground mt-1'>
                  {item.description}
                </p>
              )}

              {/* ボルダスコア・登場回数 */}
              <div className='mt-2 space-y-1 text-sm text-muted-foreground'>
                <div>
                  ランキングスコア:{" "}
                  <span className='font-medium'>{item.avgRank.toFixed(0)}</span>
                </div>
                <div>
                  集計人数: <span className='font-medium'>{item.count}</span>
                </div>
              </div>

              {item.details && (
                <div className='mt-2 grid grid-cols-2 gap-2 text-sm'>
                  {Object.entries(item.details).map(([k, v]) => (
                    <div key={k} className='flex items-center'>
                      <span className='text-muted-foreground'>{k}:</span>
                      <span className='ml-1 font-medium'>{v}</span>
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
