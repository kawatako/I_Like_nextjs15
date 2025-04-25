// components/component/profiles/LikedRankingList.tsx
"use client";

import { useCallback } from 'react';
import type { RankingListSnippet, PaginatedResponse } from "@/lib/types";
// ★★★ アクションとその戻り値型をインポート ★★★
import { getLikedRankingsAction, type LikedRankingResultItem } from "@/lib/actions/likeActions"; // likeActions.ts に作成した場合
import { useInfiniteScroll, type UseInfiniteScrollReturn } from '@/components/hooks/useInfiniteScroll'; // パス確認
// ★★★ 表示用コンポーネントをインポート ★★★
import LikedRankingListItem from './LikedRankingListItem'; // パス確認
import { Loader2 } from '@/components/component/Icons';
import type { BareFetcher } from 'swr';

// Props の型定義 (変更なし)
interface LikedRankingListProps {
  targetUserId: string;
  loggedInUserDbId: string | null;
}

// SWR キー型 (変更なし)
type LikedRankingsKey = readonly ['likedRankings', string, string | null];

export default function LikedRankingList({
  targetUserId,
  loggedInUserDbId,
}: LikedRankingListProps) {

  // SWRInfinite のキー生成関数 (変更なし - Like ID をカーソルとして扱う)
  const getKey = useCallback((pageIndex: number, previousPageData: PaginatedResponse<LikedRankingResultItem> | null): LikedRankingsKey | null => {
    const cursor = previousPageData?.nextCursor ?? null; // Like ID or null
    if (pageIndex === 0) return ['likedRankings', targetUserId, null];
    if (!previousPageData || !previousPageData.nextCursor) return null;
    return ['likedRankings', targetUserId, previousPageData.nextCursor];
  }, [targetUserId]);

  // fetcher: getLikedRankingsAction を呼び出す (型を変更)
  const fetcher = useCallback<BareFetcher<PaginatedResponse<LikedRankingResultItem>>>( // ★ ジェネリクス型変更 ★
    async (key: LikedRankingsKey) => {
      const [_, userId, cursor] = key;
      return getLikedRankingsAction(userId, cursor);
    },
    []
  );

  // useInfiniteScroll フックでデータ取得 (型を変更)
  const {
    data: likedItems, // ★ 名前を変更し、型は LikedRankingResultItem[] ★
    error,
    isLoadingMore,
    isReachingEnd,
    loadMoreRef,
    isValidating,
    mutate,
  } = useInfiniteScroll<PaginatedResponse<LikedRankingResultItem>>(getKey, fetcher, { // ★ ジェネリクス型変更 ★
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });

  // エラー/ローディング/空状態の表示 (likedLists -> likedItems に変更)
  if (error) return <div className="p-4 text-center text-red-500">読み込みに失敗しました。</div>;
  if (isLoadingMore && (!likedItems || likedItems.length === 0)) {
     return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (likedItems && likedItems.length === 0 && isReachingEnd) {
    return <div className='text-center text-muted-foreground py-8'>いいねしたランキングはありません。</div>;
  }

  return (
    <ul className="space-y-3"> {/* ul タグ */}
      {/* ★ likedItems を map ★ */}
      {likedItems && likedItems.map((item: LikedRankingResultItem) => ( // ★ item の型を変更 ★
        <LikedRankingListItem
          // ★★★ key を Like ID に変更 ★★★
          key={item.likeId}
          // ★★★ list プロパティを渡す ★★★
          list={item.list}
          loggedInUserDbId={loggedInUserDbId}
        />
      ))}
      {/* 無限スクロールのトリガーとローディング/終端表示 (likedLists -> likedItems) */}
      <div ref={loadMoreRef} className='h-10 flex justify-center items-center'>
        {(isLoadingMore || (isValidating && likedItems && likedItems.length > 0)) && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!isLoadingMore && !isValidating && isReachingEnd && likedItems && likedItems.length > 0 && ( <p className='text-gray-500 text-sm'>これ以上ありません</p> )}
      </div>
    </ul>
  );
}