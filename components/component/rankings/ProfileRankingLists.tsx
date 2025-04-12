// components/component/rankings/ProfileRankingLists.tsx
"use client"; // ★ クライアントコンポーネントにする ★

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ListStatus, Sentiment } from "@prisma/client";
import type { RankingSnippetForProfile } from "@/lib/data/userQueries";
import { loadMoreProfileRankingsAction } from "@/lib/actions/rankingActions";
import { Badge } from "@/components/ui/badge"

// ★ Props の型定義を変更 ★
interface ProfileRankingListsProps {
  targetUserId: string; // どのユーザーのリストか
  username: string; // プロフィールリンク用
  status: ListStatus; // PUBLISHED か DRAFT か
  initialLists: RankingSnippetForProfile[]; // 初期表示用リスト
  initialNextCursor: string | null; // 初期カーソル
  isCurrentUser: boolean; // 自分自身のリストかどうか (表示制御用)
}

export function ProfileRankingLists({
  targetUserId,
  username,
  status, // status を受け取る
  initialLists,
  initialNextCursor,
  isCurrentUser,
}: ProfileRankingListsProps) {
  // --- State 定義 ---
  const [lists, setLists] = useState<RankingSnippetForProfile[]>(initialLists);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialNextCursor);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // --- データ読み込み関数 ---
  const loadMoreLists = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;
    setIsLoading(true);
    console.log(
      `[ProfileRankingLists] Loading more ${status} lists for ${targetUserId}, cursor: ${cursor}`
    );

    try {
      // Server Action を呼び出し
      const result = await loadMoreProfileRankingsAction(
        targetUserId,
        status,
        cursor
      );

      if (result && result.items) {
        setLists((prevLists) => [...prevLists, ...result.items]);
        setCursor(result.nextCursor);
        setHasMore(!!result.nextCursor);
        console.log(
          `[ProfileRankingLists] Loaded ${result.items.length} items. Next cursor: ${result.nextCursor}`
        );
      } else {
        console.warn(
          "[ProfileRankingLists] loadMoreProfileRankingsAction returned unexpected data:",
          result
        );
        setHasMore(false);
      }
    } catch (error) {
      console.error("[ProfileRankingLists] Error in loadMoreLists:", error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading, targetUserId, status]); // 依存配列に targetUserId と status も追加

  // --- Intersection Observer 設定 ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreLists();
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
  }, [hasMore, isLoading, loadMoreLists]);

  // --- 表示部分 ---
  if (lists.length === 0 && !isLoading) {
    // 初期データも空で、ローディング中でもない場合
    return (
      <div className='text-center text-muted-foreground py-8'>
        {status === ListStatus.PUBLISHED
          ? isCurrentUser
            ? "まだ公開済みのランキングはありません。"
            : "公開済みのランキングはまだありません。"
          : "下書きのランキングはありません。"}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {lists.map((list) => {
        const sentimentLabel =
          list.sentiment === Sentiment.LIKE ? "好きな" : "嫌いな";
        const listDetailUrl = `/rankings/${list.id}`; // リンク先を確認

        return (
          <Link
            href={listDetailUrl}
            key={list.id}
            className='block p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors'
          >
            <h3 className='text-lg font-semibold mb-2'>
              <span className='mr-2'>{sentimentLabel}</span>
              {list.subject}
            </h3>
            {list.items.length > 0 ? (
              <ol className='list-none pl-4 space-y-1 text-sm text-muted-foreground'>
                {list.items.map((item) => (
                  <li key={item.id} className='truncate'>
                    <span className='font-medium mr-2'>{item.rank}.</span>
                    {item.itemName}
                  </li>
                ))}
                {/* アイテム総数が取得件数(take:3)より多いことを示す（任意） */}
                {(list._count?.items ?? 0) > list.items.length && (
                  <li className='text-xs text-muted-foreground pt-1'>...</li>
                )}
              </ol>
            ) : (
              <p className='text-sm text-muted-foreground pl-4'>
                アイテムがありません。
              </p>
            )}
            {/* 作成/更新日時やステータスなど表示しても良い */}
            <div className='text-xs text-muted-foreground mt-2 text-right'>
              {list.status === ListStatus.DRAFT && (
                <Badge variant='outline' className='mr-2'>
                  下書き
                </Badge>
              )}
              {new Date(list.updatedAt).toLocaleDateString("ja-JP")} 更新
            </div>
          </Link>
        );
      })}

      {/* 読み込みトリガー / ローディング表示 / 終端表示 */}
      <div ref={observerRef} className='h-10 flex justify-center items-center'>
        {isLoading && <p className='text-gray-500'>読み込み中...</p>}
        {!isLoading && !hasMore && lists.length > 0 && (
          <p className='text-gray-500'>これ以上ありません</p>
        )}
      </div>
    </div>
  );
}
