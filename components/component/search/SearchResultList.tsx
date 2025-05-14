//component/search/SearchResultList.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { RankingListSnippet, UserSnippet } from "@/lib/types";

interface SearchResultListProps {
  items: (RankingListSnippet | UserSnippet)[];
  tab: "title" | "item" | "tag" | "user";
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  isReachingEnd: boolean;
  loadMoreRef: (node?: Element | null) => void;
}

export default function SearchResultList({
  items,
  tab,
  isLoadingInitial,
  isLoadingMore,
  isReachingEnd,
  loadMoreRef,
}: SearchResultListProps) {
  if (isLoadingInitial) {
    return <p className="text-center py-8">読み込み中...</p>;
  }

  if (items.length === 0 && isReachingEnd) {
    return (
      <p className="text-center py-8 text-muted-foreground">結果がありません</p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) =>
        tab === "user" ? (
          <li key={item.id}>
            <Link href={`/profile/${(item as UserSnippet).username}`}>
              <div className="flex items-center gap-2">
                {(item as UserSnippet).image && (
                  <Image
                    src={(item as UserSnippet).image!}
                    alt={(item as UserSnippet).username}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold">
                    @{(item as UserSnippet).username}
                  </p>
                  {(item as UserSnippet).name && (
                    <p className="text-muted-foreground">
                      {(item as UserSnippet).name}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ) : (
          <li key={item.id} className="border-b pb-4">
            <Link href={`/rankings/${(item as RankingListSnippet).id}`}>
              <h3 className="text-lg font-semibold">
                {(item as RankingListSnippet).subject}
              </h3>
              {(item as RankingListSnippet).description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {(item as RankingListSnippet).description}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {(item as RankingListSnippet).items.map(
                  (subItem) =>
                    subItem.imageUrl && (
                      <div key={subItem.id} className="relative w-8 h-8">
                        <Image
                          src={subItem.imageUrl}
                          alt={subItem.itemName}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    )
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                いいね: {(item as RankingListSnippet).likeCount} / アイテム:{" "}
                {(item as RankingListSnippet)._count.items}
              </div>
            </Link>
          </li>
        )
      )}
      <li ref={loadMoreRef} className="h-6 flex justify-center items-center">
        {isLoadingMore && <p>読み込み中...</p>}
        {!isLoadingMore && isReachingEnd && (
          <p className="text-muted-foreground">これ以上ありません</p>
        )}
      </li>
    </ul>
  );
}
