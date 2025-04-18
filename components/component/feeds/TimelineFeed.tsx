// components/component/feeds/TimelineFeed.tsx
"use client";

import { useEffect} from "react"; // useState, setIsLoading, setHasMore, setCursor は不要に
import useSWRInfinite from "swr/infinite"; // ★ useSWRInfinite をインポート ★
import { useInView } from "react-intersection-observer";
import type { FeedItemWithRelations, PaginatedResponse } from "@/lib/types"; // 型をインポート
import PostCard from "./cards/PostCard";
import RankingUpdateCard from "./cards/RankingUpdateCard";
import RetweetCard from "./cards/RetweetCard";
import QuoteRetweetCard from "./cards/QuoteRetweetCard";
// ★ データ取得用 Server Action をインポート ★
import { getPaginatedFeedItemsAction } from "@/lib/actions/feedActions";
import { FeedType } from "@prisma/client";
import { Loader2 } from "lucide-react";
// import { useToast } from "@/components/hooks/use-toast"; // エラー表示は SWR の error オブジェクトで可能

interface TimelineFeedProps {
  initialItems: FeedItemWithRelations[]; // 初期データ
  initialNextCursor: string | null; // 初期カーソル
  loggedInUserDbId: string | null; // ログインユーザーID
}

// ★ SWRInfinite のキーを生成する関数 ★
const getKey = (pageIndex: number, previousPageData: PaginatedResponse<FeedItemWithRelations> | null) => {
  // 最初のページ
  if (pageIndex === 0) return ['timelineFeed', null]; // キー: ['timelineFeed', null]

  // 前のページが終端なら null を返す
  if (!previousPageData || !previousPageData.nextCursor) return null;

  // 次のページのキー (前のページの nextCursor を使う)
  return ['timelineFeed', previousPageData.nextCursor]; // キー: ['timelineFeed', 'cursor_string']
};

export default function TimelineFeed({
  initialItems,
  initialNextCursor,
  loggedInUserDbId,
}: TimelineFeedProps) {
  // const { toast } = useToast(); // SWR が error を返すので Toast はここでなくても良いかも

  // ★ useSWRInfinite でデータを取得・管理 ★
  const { data: pages, error, size, setSize, isLoading, isValidating } =
    useSWRInfinite<PaginatedResponse<FeedItemWithRelations>>(
      getKey,
      {
        fallbackData: [{ items: initialItems, nextCursor: initialNextCursor }],
        revalidateFirstPage: false,
        // ★ 自動再検証を無効化 ★
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false, // stale 状態でも自動再検証しない
      }
    );


  // ★ 表示するアイテムリストを pages 配列からフラット化 ★
  const feedItems = pages ? pages.flatMap((page) => page.items) : initialItems;
  // ★ 次のページがあるかどうかを判定 ★
  const hasMore = pages
    ? pages[pages.length - 1]?.nextCursor !== null
    : initialNextCursor !== null;
  // ★ ローディング状態を判定 (初回 or 追加読み込み) ★
  const isLoadingMore =
    isLoading ||
    (size > 0 && pages && typeof pages[size - 1] === "undefined" && hasMore);

  // ★ 無限スクロール用のトリガーrefとロジック ★
  const { ref, inView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    // 画面内に入り、さらに読み込むデータがあり、ローディング中でなければ次のページを要求
    if (inView && hasMore && !isLoadingMore && !isValidating) {
      setSize(size + 1);
    }
  }, [inView, hasMore, isLoadingMore, isValidating, size, setSize]); // 依存配列を更新

  // ★ エラーハンドリング ★
  if (error) {
    console.error("SWR Error fetching feed:", error);
    // ここでエラー UI を表示することもできる
    return (
      <div className='p-4 text-center text-red-500'>
        タイムラインの読み込みに失敗しました。
      </div>
    );
  }

  return (
    <div className='space-y-0'>
      {feedItems.map((item) => {
        // ★ 自分のリツイートを除外するフィルタリング ★
        if (
          item.type === FeedType.RETWEET &&
          item.userId === loggedInUserDbId
        ) {
          return null;
        }
        // --- カード表示の switch 文 (変更なし) ---
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
      <div ref={ref} className='h-10 flex justify-center items-center'>
        {/* ★ ローディング状態を isLoadingMore と isValidating で判定 ★ */}
        {(isLoadingMore || (isValidating && feedItems.length > 0)) && (
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        )}
        {/* ★ hasMore で終端判定 ★ */}
        {!isLoadingMore &&
          !isValidating &&
          !hasMore &&
          feedItems.length > 0 && (
            <p className='text-gray-500 text-sm'>これ以上ありません</p>
          )}
      </div>
      {/* ★ 初期データもなく、ローディング中でもない場合のエンプティステート ★ */}
      {feedItems.length === 0 &&
        !isLoadingMore &&
        !isValidating &&
        !hasMore && (
          <p className='text-center text-gray-500 py-4'>
            表示する投稿がありません。
          </p>
        )}
    </div>
  );
}
