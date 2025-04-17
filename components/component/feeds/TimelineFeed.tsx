// components/component/feeds/TimelineFeed.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react"; // ★ useTransition をインポート ★
import type { FeedItemWithRelations } from "@/lib/types"
import PostCard from "./cards/PostCard";
import RankingUpdateCard from "./cards/RankingUpdateCard";
import RetweetCard from "./cards/RetweetCard";
import QuoteRetweetCard from "./cards/QuoteRetweetCard";
import { loadMoreFeedItemsAction } from "@/lib/actions/feedActions"; // ★ Server Action をインポート ★
import { FeedType } from "@prisma/client"; // ★ FeedType Enum をインポート ★
import { Loader2 } from "lucide-react"; // ローディングアイコン用
import { useToast } from "@/components/hooks/use-toast"; // ★ Toast をインポート ★

interface TimelineFeedProps {
  initialItems: FeedItemWithRelations[];
  initialNextCursor: string | null;
  loggedInUserDbId: string | null;
}

export default function TimelineFeed({
  initialItems,
  initialNextCursor,
  loggedInUserDbId,
}: TimelineFeedProps) {
  const [feedItems, setFeedItems] =
    useState<FeedItemWithRelations[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false); // データの追加読み込み中
  const [hasMore, setHasMore] = useState(!!initialNextCursor);
  const [isPending, startTransition] = useTransition(); // ★ Server Action 実行中の状態管理 ★
  const observerRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast(); // ★ Toast フック ★

  // ★ 無限スクロールのためのデータ読み込み関数 (実装) ★
  const loadMoreItems = useCallback(async () => {
    // ローディング中、これ以上ない、カーソルがない場合は中断
    if (isLoading || isPending || !hasMore || !cursor) return;

    setIsLoading(true); // UI 上のローディング表示用
    console.log("TimelineFeed: Loading more items with cursor:", cursor);

    startTransition(async () => {
      // Server Action 呼び出しを Transition でラップ
      try {
        // Server Action を呼び出して次のデータを取得
        const result = await loadMoreFeedItemsAction(cursor);

        if (result && result.items) {
          // ★ 自分のリツイートを除外するフィルタリング ★
          const newItems = result.items.filter(
            (newItem) =>
              !(
                newItem.type === FeedType.RETWEET &&
                newItem.userId === loggedInUserDbId
              )
          );

          setFeedItems((prevItems) => [...prevItems, ...newItems]);
          setCursor(result.nextCursor);
          setHasMore(result.nextCursor !== null);
          console.log(
            `TimelineFeed: Loaded ${newItems.length} new items. Next cursor: ${result.nextCursor}`
          );
        } else {
          // result が予期しない形式の場合
          console.warn(
            "TimelineFeed: loadMoreFeedItemsAction returned unexpected data:",
            result
          );
          setHasMore(false); // 安全のため停止
        }
      } catch (error) {
        console.error("TimelineFeed: Error loading more items:", error);
        toast({
          // ★ エラー時にトースト表示 ★
          title: "エラー",
          description: "タイムラインの読み込みに失敗しました。",
          variant: "destructive",
        });
        setHasMore(false); // エラー時は停止
      } finally {
        setIsLoading(false); // UI ローディング解除
      }
    });
  }, [
    cursor,
    hasMore,
    isLoading,
    isPending,
    loggedInUserDbId,
    toast,
    startTransition,
  ]); // ★ 依存配列に isPending, loggedInUserDbId, toast, startTransition を追加 ★

  // Intersection Observer の設定 (変更なし)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isPending) {
          // ★ !isPending も条件に追加 ★
          loadMoreItems();
        }
      },
      { threshold: 0.1 } // 10%見えたらトリガー
    );
    const currentObserverRef = observerRef.current;
    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }
    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [hasMore, isLoading, isPending, loadMoreItems]); // ★ isPending を依存配列に追加 ★

  return (
    <div className='space-y-0'>
      {feedItems.map((item) => {
        // ★ 自分のリツイートはここでフィルタリングせず、loadMoreItems 内で行う ★
        // if (item.type === FeedType.RETWEET && item.userId === loggedInUserDbId) {
        //   return null;
        // }

        switch (item.type) {
          // ★ Enum を使用 ★
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
            console.warn("Unknown FeedItem type:", item.type, item.id);
            return (
              <div key={item.id} className='border-b p-3'>
                {" "}
                <p>Unknown feed item type: {item.type}</p>{" "}
              </div>
            );
        }
      })}

      {/* 読み込みトリガー / ローディング表示 / 終端表示 */}
      {/* ★ ローディングアイコンに Loader2 (lucide-react) を使用する例 ★ */}
      <div ref={observerRef} className='h-10 flex justify-center items-center'>
        {(isLoading || isPending) && (
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        )}
        {!isLoading && !isPending && !hasMore && feedItems.length > 0 && (
          <p className='text-gray-500 text-sm'>これ以上ありません</p>
        )}
      </div>
      {/* 初期データも空で、読み込み中でもない場合 */}
      {feedItems.length === 0 && !isLoading && !isPending && !hasMore && (
        <p className='text-center text-gray-500 py-4'>
          表示する投稿がありません。
        </p>
      )}
    </div>
  );
}
