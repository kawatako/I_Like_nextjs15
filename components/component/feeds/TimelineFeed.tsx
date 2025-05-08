// components/component/feeds/TimelineFeed.tsx
"use client";

import { useCallback } from "react";
import type { FeedItemWithRelations, PaginatedResponse } from "@/lib/types";
import PostCard from "./cards/PostCard";
import RankingUpdateCard from "./cards/RankingUpdateCard";
import RetweetCard from "./cards/RetweetCard";
import QuoteRetweetCard from "./cards/QuoteRetweetCard";
import { getPaginatedFeedAction, type FeedKey } from '@/lib/actions/feedActions';
import { FeedType } from "@prisma/client";
import { Loader2 } from "@/components/component/Icons";
import { useInfiniteScroll } from "@/components/hooks/useInfiniteScroll"; // パスを確認

// Props 定義
interface TimelineFeedProps {
  feedType: 'home' | 'profile';
  loggedInUserDbId: string | null;
  targetUserId?: string;
}

export default function TimelineFeed({
  feedType,
  loggedInUserDbId,
  targetUserId,
}: TimelineFeedProps) {

  // ★ SWRInfinite のキーを生成する関数 ★
  const getKey = useCallback((pageIndex: number, previousPageData: PaginatedResponse<FeedItemWithRelations> | null): FeedKey | null => {
    const cursor = previousPageData?.nextCursor ?? null;
    // pageIndex が 0 より大きく、かつ前のページのカーソルが null なら終端
    if (pageIndex > 0 && (!previousPageData || !previousPageData.nextCursor)) {
        return null;
    }
    // 最初のページまたはカーソルがある場合
    if (feedType === 'home') {
      return ['homeFeed', loggedInUserDbId, cursor];
    } else if (feedType === 'profile' && targetUserId) {
      return ['profileFeed', targetUserId, cursor];
    }
    return null; // 不正な場合は null
  }, [feedType, loggedInUserDbId, targetUserId]);

  // ★ fetcher (useCallback の型注釈 <BareFetcher<...>> を削除) ★
  const fetcher = useCallback(
     async (key: FeedKey) => { // 引数の型は FeedKey (Actionからexport)
       return getPaginatedFeedAction(key);
     },
     [] // 依存配列は空でOK
  );

  // ★ useInfiniteScroll フック呼び出し (fallbackData を削除) ★
  const {
    data: feedItems, error, isLoadingMore, isReachingEnd, loadMoreRef, isValidating
  } = useInfiniteScroll<PaginatedResponse<FeedItemWithRelations>>(
    getKey,
    fetcher,
    { // ★ fallbackData を削除 ★
      // fallbackData: [{ items: initialItems, nextCursor: initialNextCursor }], // ← この行を削除
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  // ★ エラーハンドリング (変更なし) ★
  if (error) {
    console.error("SWR Error fetching feed:", error);
    return <div className='p-4 text-center text-red-500'>タイムラインの読み込みに失敗しました。</div>;
  }

  // ★ 初回ロード中 or データがまだない場合の表示 ★
  if (!feedItems && isLoadingMore) {
     return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  // ★ feedItems が空配列でも初期ロード中などはありうるため、 !feedItems のチェックのみで良いかも ★
  // if (!feedItems) {
  //    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  // }


  return (
    <div className='space-y-0'>
      {/* ★ feedItems が null/undefined でないことを確認してから map ★ */}
      {feedItems && feedItems.length > 0 && feedItems.map((item: FeedItemWithRelations) => { // 型注釈を追加
        // 自分のリツイート除外フィルター (必要なら)
        if (item.type === FeedType.RETWEET && item.user.id === loggedInUserDbId) {
          return null;
        }
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
        {(isLoadingMore || (isValidating && feedItems && feedItems.length > 0)) && (
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        )}
        {!isLoadingMore && !isValidating && isReachingEnd && feedItems && feedItems.length > 0 && (
            <p className='text-gray-500 text-sm'>これ以上ありません</p>
          )}
      </div>
      {/* エンプティステート */}
      {/* ★ feedItems が空配列で、かつ終端に達している場合 ★ */}
      {feedItems && feedItems.length === 0 && !isLoadingMore && !isValidating && isReachingEnd && (
          <p className='text-center text-gray-500 py-4'>
            表示する投稿がありません。
          </p>
        )}
    </div>
  );
}