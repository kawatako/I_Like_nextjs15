// components/component/feeds/TimelineFeed.tsx
"use client";

import { useCallback } from "react"; // ★ useCallback をインポート (fetcher メモ化用) ★
// import { useState, useEffect, useRef } from "react"; // ← これらは不要になる
import type { FeedItemWithRelations, PaginatedResponse } from "@/lib/types";
import PostCard from "./cards/PostCard";
import RankingUpdateCard from "./cards/RankingUpdateCard";
import RetweetCard from "./cards/RetweetCard";
import QuoteRetweetCard from "./cards/QuoteRetweetCard";
import { getPaginatedFeedItemsAction } from "@/lib/actions/feedActions";
import { FeedType } from "@prisma/client";
import { Loader2 } from "@/components/component/Icons"; // Loader2 アイコンをインポート
// ★ カスタムフックをインポート ★
import { useInfiniteScroll } from "@/components/hooks/useInfiniteScroll"; // パスは実際の場所に合わせてください

interface TimelineFeedProps {
  initialItems: FeedItemWithRelations[];
  initialNextCursor: string | null;
  loggedInUserDbId: string | null;
}

// ★ SWRInfinite のキーを生成する関数 (変更なし) ★
const getKey = (
  pageIndex: number,
  previousPageData: PaginatedResponse<FeedItemWithRelations> | null
) => {
  if (pageIndex === 0) return ["timelineFeed", null];
  if (!previousPageData || !previousPageData.nextCursor) return null;
  return ["timelineFeed", previousPageData.nextCursor];
};

export default function TimelineFeed({
  initialItems,
  initialNextCursor,
  loggedInUserDbId,
}: TimelineFeedProps) {
  // ★ データ取得関数 (fetcher) を定義 (useCallback でメモ化推奨) ★
  const fetcher = useCallback(async (key: [string, string | null]) => {
    const cursor = key[1];
    // Server Action を呼び出し (認証等は Action 内で行われる)
    return getPaginatedFeedItemsAction(cursor ?? undefined);
  }, []); // 依存配列は空

  // ★★★ useInfiniteScroll カスタムフックを呼び出す ★★★
  const {
    data: feedItems, // ★ フラット化されたデータ配列 ★
    error, // エラーオブジェクト
    isLoadingMore, // ローディング中か
    isReachingEnd, // 終端に達したか
    loadMoreRef, // ★ トリガー要素に設定する ref ★
    isValidating, // ★ 再検証中か (ローディング表示にも使う) ★
    // mutate, size, setSize なども必要なら受け取れる
  } = useInfiniteScroll<PaginatedResponse<FeedItemWithRelations>>(
    getKey,
    fetcher,
    {
      // SWR オプション (初期データと自動再検証オフ設定)
      fallbackData: [{ items: initialItems, nextCursor: initialNextCursor }],
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
    // threshold はデフォルト (0.1) を使うなら省略可
  );

  // ★ useState, useEffect, useRef (observerRef), loadMoreItems は不要になったので削除 ★

  // ★ エラーハンドリング ★
  if (error) {
    console.error("SWR Error fetching feed:", error);
    return (
      <div className='p-4 text-center text-red-500'>
        タイムラインの読み込みに失敗しました。
      </div>
    );
  }

  return (
    <div className='space-y-0'>
      {/* ★ feedItems を map して表示 (フックから取得したデータを使う) ★ */}
      {feedItems.map((item) => {
        // カード表示の switch 文 (変更なし)
        switch (item.type) {
          case FeedType.POST:
            return (
              <PostCard
                key={item.id}
                item={item}
                loggedInUserDbId={loggedInUserDbId}
              />
            );
          case FeedType.RANKING_UPDATE:
            return (
              <RankingUpdateCard
                key={item.id}
                item={item}
                loggedInUserDbId={loggedInUserDbId}
              />
            );
          case FeedType.RETWEET:
            return (
              <RetweetCard
                key={item.id}
                item={item}
                loggedInUserDbId={loggedInUserDbId}
              />
            );
          case FeedType.QUOTE_RETWEET:
            return (
              <QuoteRetweetCard
                key={item.id}
                item={item}
                loggedInUserDbId={loggedInUserDbId}
              />
            );
          default:
            return null;
        }
      })}

      {/* 読み込みトリガー / ローディング表示 / 終端表示 */}
      {/* ★ フックから受け取った ref と状態変数を使う ★ */}
      <div ref={loadMoreRef} className='h-10 flex justify-center items-center'>
        {(isLoadingMore || isValidating) && (
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        )}
        {!isLoadingMore &&
          !isValidating &&
          isReachingEnd &&
          feedItems.length > 0 && (
            <p className='text-gray-500 text-sm'>これ以上ありません</p>
          )}
      </div>
      {/* エンプティステート */}
      {feedItems.length === 0 &&
        !isLoadingMore &&
        !isValidating &&
        isReachingEnd && (
          <p className='text-center text-gray-500 py-4'>
            表示する投稿がありません。
          </p>
        )}
    </div>
  );
}
