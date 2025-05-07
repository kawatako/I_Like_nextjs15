// components/component/search/SearchResultList.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image"; // ← 追加
import type { RankingListSnippet } from "@/lib/types";

interface SearchResultListProps {
  items: RankingListSnippet[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  isReachingEnd: boolean;
  loadMoreRef: (node?: Element | null) => void;
}

export default function SearchResultList({
  items,
  isLoadingInitial,
  isLoadingMore,
  isReachingEnd,
  loadMoreRef,
}: SearchResultListProps) {
  if (isLoadingInitial) {
    return <p className="text-center py-8">読み込み中...</p>;
  }

  if (items.length === 0 && isReachingEnd) {
    return <p className="text-center py-8 text-muted-foreground">結果がありません</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((list) => (
        <li key={list.id} className="border-b pb-4">
          <Link href={`/rankings/${list.id}`} className="block">
            <h3 className="text-lg font-semibold">{list.subject}</h3>
            {list.description && (
              <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
            )}
            <div className="flex gap-2 mt-2">
              {list.items.map((item) =>
                item.imageUrl ? (
                  <div key={item.id} className="relative w-8 h-8">
                    <Image
                      src={item.imageUrl}
                      alt={item.itemName}
                      fill
                      className="object-cover rounded"
                      priority={false}
                    />
                  </div>
                ) : null
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              いいね: {list.likeCount} / アイテム: {list._count.items}
            </div>
          </Link>
        </li>
      ))}
      {/* 無限スクロールのトリガー要素 */}
      <li ref={loadMoreRef} className="h-6 flex justify-center items-center">
        {isLoadingMore && <p>読み込み中...</p>}
        {!isLoadingMore && isReachingEnd && <p className="text-muted-foreground">これ以上ありません</p>}
      </li>
    </ul>
  );
}
