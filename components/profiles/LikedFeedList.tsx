// components/profiles/LikedFeedList.tsx
"use client";

import { useCallback } from "react";
import type {
  PaginatedResponse,
} from "@/lib/types"; // RankingListSnippet も念のため
import {
  getLikedFeedItemsAction,
  type LikedFeedResultItem,
} from "@/lib/actions/likeActions"; // アクションと結果の型
import {
  useInfiniteScroll,
} from "@/lib/hooks/useInfiniteScroll"; // SWRInfinite フック
import PostCard from "@/components/feeds/cards/PostCard";
import RankingUpdateCard from "@/components/feeds/cards/RankingUpdateCard";
import RetweetCard from "@/components/feeds/cards/RetweetCard";
import QuoteRetweetCard from "@/components/feeds/cards/QuoteRetweetCard";
import { FeedType } from "@prisma/client";
import { Loader2 } from "@/components/Icons";
import type { BareFetcher } from "swr";

// Props の型定義
interface LikedFeedListProps {
  targetUserId: string;
  loggedInUserDbId: string | null;
}

// SWR キー型
type LikedFeedKey = readonly ["likedFeed", string, string | null]; // type, targetUserId, cursor(Like ID)

export default function LikedFeedList({
  targetUserId,
  loggedInUserDbId,
}: LikedFeedListProps) {
  // SWRInfinite のキー生成関数
  const getKey = useCallback(
    (
      pageIndex: number,
      previousPageData: PaginatedResponse<LikedFeedResultItem> | null
    ): LikedFeedKey | null => {
      const cursor = previousPageData?.nextCursor ?? null; // Like ID or null
      if (pageIndex === 0) return ["likedFeed", targetUserId, null];
      if (!previousPageData || !previousPageData.nextCursor) return null; // 終端
      return ["likedFeed", targetUserId, previousPageData.nextCursor];
    },
    [targetUserId]
  );

  // fetcher: getLikedFeedItemsAction を呼び出す
  const fetcher = useCallback<
    BareFetcher<PaginatedResponse<LikedFeedResultItem>>
  >(async (key: LikedFeedKey) => {
    const [_, userId, cursor] = key;
    return getLikedFeedItemsAction(userId, cursor);
  }, []);

  // useInfiniteScroll フックでデータ取得 (型を変更)
  const {
    data: likedItems, // ★ データ名は likedItems (LikedFeedResultItem[] 型) ★
    error,
    isLoadingMore,
    isReachingEnd,
    loadMoreRef,
    isValidating,
    mutate,
  } = useInfiniteScroll<PaginatedResponse<LikedFeedResultItem>>(
    getKey,
    fetcher,
    {
      // ★ ジェネリクス型変更 ★
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  // エラー表示
  if (error) {
    console.error("SWR Error fetching liked feed:", error);
    return (
      <div className='p-4 text-center text-red-500'>
        いいねしたフィードの読み込みに失敗しました。
      </div>
    );
  }

  // 初回ローディング表示
  if (isLoadingMore && (!likedItems || likedItems.length === 0)) {
    return (
      <div className='flex justify-center p-4'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  // 読み込み完了後、データが空の場合の表示
  if (likedItems && likedItems.length === 0 && isReachingEnd) {
    return (
      <div className='text-center text-muted-foreground py-8'>
        いいねした投稿やランキングはありません。
      </div>
    );
  }

  return (
    <div className='space-y-0'>
      {/* ★ likedItems 配列を map する ★ */}
      {likedItems &&
        likedItems.map((item: LikedFeedResultItem) => {
          // ★ item は { likeId, feedItem } の形 ★
          const feedItem = item.feedItem; // 表示に使う FeedItem データを取り出す
          // feedItem が null の場合はスキップ (念のため)
          if (!feedItem) return null;

          // ★ key には likeId を使う ★
          // ★ 各カードに渡す item は feedItem を使う ★
          switch (feedItem.type) {
            case FeedType.POST:
              return (
                <PostCard
                  key={item.likeId}
                  item={feedItem}
                  loggedInUserDbId={loggedInUserDbId}
                />
              );
            case FeedType.RANKING_UPDATE:
              return (
                <RankingUpdateCard
                  key={item.likeId}
                  item={feedItem}
                  loggedInUserDbId={loggedInUserDbId}
                />
              );
            case FeedType.RETWEET:
              return (
                <RetweetCard
                  key={item.likeId}
                  item={feedItem}
                  loggedInUserDbId={loggedInUserDbId}
                />
              );
            case FeedType.QUOTE_RETWEET:
              return (
                <QuoteRetweetCard
                  key={item.likeId}
                  item={feedItem}
                  loggedInUserDbId={loggedInUserDbId}
                />
              );
            default:
              console.warn(
                "Unknown feed item type in LikedFeedList:",
                feedItem.type
              );
              return null;
          }
        })}
      {/* 無限スクロールトリガーと状態表示 */}
      <div ref={loadMoreRef} className='h-10 flex justify-center items-center'>
        {(isLoadingMore ||
          (isValidating && likedItems && likedItems.length > 0)) && (
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        )}
        {!isLoadingMore &&
          !isValidating &&
          isReachingEnd &&
          likedItems &&
          likedItems.length > 0 && (
            <p className='text-gray-500 text-sm'>これ以上ありません</p>
          )}
      </div>
    </div>
  );
}
