// components/component/profiles/ProfileTimelineFeed.tsx
"use client";

import { useCallback } from "react";
import type { FeedItemWithRelations, PaginatedResponse } from "@/lib/types";
import PostCard from "@/components/component/feeds/cards/PostCard";
import RankingUpdateCard from "@/components/component/feeds/cards/RankingUpdateCard";
import RetweetCard from "@/components/component/feeds/cards/RetweetCard";
import QuoteRetweetCard from "@/components/component/feeds/cards/QuoteRetweetCard";
import { getPaginatedFeedAction} from '@/lib/actions/feedActions';
import { FeedKey } from '@/lib/types';
import { FeedType } from "@prisma/client";
import { Loader2 } from "@/components/component/Icons";
// ★ カスタムフックのパスを修正 ★
import { useInfiniteScroll } from '@/components/hooks/useInfiniteScroll'
import type { BareFetcher } from 'swr';

// Props: targetUserId を必須にする
interface ProfileTimelineFeedProps {
  loggedInUserDbId: string | null;
  targetUserId: string; // ★ 必須に変更 ★
}

export function ProfileTimelineFeed({
  loggedInUserDbId,
  targetUserId, // ★ 受け取る ★
}: ProfileTimelineFeedProps) {

  // SWRInfinite のキー生成関数 (プロフィール用)
  const getKey = useCallback((pageIndex: number, previousPageData: PaginatedResponse<FeedItemWithRelations> | null): FeedKey | null => {
    const cursor = previousPageData?.nextCursor ?? null;
    if (pageIndex > 0 && !previousPageData?.nextCursor) return null; // 終端
    // ★ プロフィール用のキーのみを生成 ★
    return ['profileFeed', targetUserId, cursor];
  }, [targetUserId]); // 依存配列は targetUserId のみ

  // fetcher (変更なし)
  const fetcher = useCallback<BareFetcher<PaginatedResponse<FeedItemWithRelations>>>(
     async (key: FeedKey) => getPaginatedFeedAction(key),
     []
  );

  // useInfiniteScroll フック呼び出し
  const {
    data: feedItems, error, isLoadingMore, isReachingEnd, loadMoreRef, isValidating
  } = useInfiniteScroll<PaginatedResponse<FeedItemWithRelations>>(
    getKey,
    fetcher,
    { // fallbackData は使わない
      revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false,
    }
  );

  // エラーハンドリング
  if (error) {
    console.error("SWR Error fetching profile feed:", error);
    return <div className='p-4 text-center text-red-500'>フィードの読み込みに失敗しました。</div>;
  }

  // 初回ロード中 or データがない場合の表示
  if (isLoadingMore && (!feedItems || feedItems.length === 0)) {
     return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // データが空の場合の表示 (ロード完了後)
  if (feedItems && feedItems.length === 0 && isReachingEnd) {
    return <p className='text-center text-gray-500 py-8'>表示する投稿がありません。</p>;
  }

  return (
    <div className='space-y-0'>
      {/* ★ 自分のリツイート非表示フィルターは削除 ★ */}
      {feedItems && feedItems.map((item: FeedItemWithRelations) => {
        // カード表示の switch 文
        switch (item.type) {
          case FeedType.POST: return <PostCard key={item.id} item={item} loggedInUserDbId={loggedInUserDbId}/>;
          case FeedType.RANKING_UPDATE: return <RankingUpdateCard key={item.id} item={item} loggedInUserDbId={loggedInUserDbId}/>;
          case FeedType.RETWEET: return <RetweetCard key={item.id} item={item} loggedInUserDbId={loggedInUserDbId}/>;
          case FeedType.QUOTE_RETWEET: return <QuoteRetweetCard key={item.id} item={item} loggedInUserDbId={loggedInUserDbId}/>;
          default: return null;
        }
      })}

      {/* 読み込みトリガー / ローディング表示 / 終端表示 */}
      <div ref={loadMoreRef} className='h-10 flex justify-center items-center'>
        {(isLoadingMore || (isValidating && feedItems && feedItems.length > 0)) && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!isLoadingMore && !isValidating && isReachingEnd && feedItems && feedItems.length > 0 && ( <p className='text-gray-500 text-sm'>これ以上ありません</p> )}
      </div>
      {/* エンプティステート (最終調整) */}
      {/* {feedItems && feedItems.length === 0 && !isLoadingMore && !isValidating && isReachingEnd && ( <p>...</p> )} */}
    </div>
  );
}