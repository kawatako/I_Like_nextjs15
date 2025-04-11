// components/component/feeds/TimelineFeed.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FeedItemWithRelations } from "@/lib/data/feedQueries";
import PostCard from "./cards/PostCard";
import RankingUpdateCard from "./cards/RankingUpdateCard";
import RetweetCard from "./cards/RetweetCard";
import QuoteRetweetCard from "./cards/QuoteRetweetCard";
import { loadMoreFeedItemsAction } from '@/lib/actions/feedActions';

interface TimelineFeedProps {
  initialItems: FeedItemWithRelations[];
  initialNextCursor: string | null;
  // 必要であれば userId なども受け取る
}

export default function TimelineFeed({
  initialItems,
  initialNextCursor,
}: TimelineFeedProps) {
  const [feedItems, setFeedItems] =
    useState<FeedItemWithRelations[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialNextCursor); // カーソルがあれば true
  const observerRef = useRef<HTMLDivElement | null>(null); // Intersection Observer 用

  // ★ 無限スクロールのためのデータ読み込み関数
  const loadMoreItems = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;
    setIsLoading(true);
    console.log("Attempting to load more items with cursor:", cursor);

    try {
      // --- ここで Server Action を呼び出す (今後実装) ---
      // const result = await loadMoreFeedItemsAction(cursor);
      alert("Load more function not implemented yet."); // 仮のアラート
      setHasMore(false); // 仮で停止
    } catch (error) {
      console.error("Error loading more items:", error);
      setHasMore(false); // エラー時は停止
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading]);

  // ★ Intersection Observer の設定 ★
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreItems();
        }
      },
      { threshold: 1.0 }
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
  }, [hasMore, isLoading, loadMoreItems]);

  return (
    <div className='space-y-0'>
      {" "}
      {/* カード間のデフォルトマージンは PostCard 側で制御するので 0 に */}
      {feedItems.map((item) => {
        // --- item.type に応じて表示するコンポーネントを切り替える ---
        switch (item.type) {
          case "POST":
            return <PostCard key={item.id} item={item} />;
          case "RANKING_UPDATE":
            return <RankingUpdateCard key={item.id} item={item} />;
          case "RETWEET":
            return <RetweetCard key={item.id} item={item} />;
          case "QUOTE_RETWEET":
            return <QuoteRetweetCard key={item.id} item={item} />;
          default:
            // 未知のタイプや表示未対応の場合は null またはプレースホルダーを表示
            console.warn("Unknown FeedItem type:", item.type, item.id);
            return (
              <div key={item.id} className='border-b p-3'>
                <p>Unknown or unsupported feed item type: {item.type}</p>
              </div>
            );
        }
      })}
      {/* 読み込みトリガー / ローディング表示 / 終端表示 (変更なし) */}
      <div ref={observerRef} className='h-10 flex justify-center items-center'>
        {isLoading && <p className='text-gray-500'>読み込み中...</p>}
        {!isLoading && !hasMore && feedItems.length > 0 && (
          <p className='text-gray-500'>これ以上ありません</p>
        )}
      </div>
      {feedItems.length === 0 && !isLoading && (
        <p className='text-center text-gray-500 py-4'>
          表示する投稿がありません。
        </p>
      )}
    </div>
  );
}
