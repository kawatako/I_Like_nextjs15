// components/component/follows/FollowersList.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "@/components/component/Icons"; // Loader2 アイコンをインポート

// ★ サーバーアクションと型をインポート (getPaginatedFollowers に変更) ★
import { getPaginatedFollowers } from "@/lib/actions/followActions";
import type { UserSnippet } from "@/lib/types"

interface FollowersListProps {
  targetUserId: string; // フォロワーリストを表示する対象ユーザーのDB ID
}

const ITEMS_PER_PAGE = 20; // 1度に読み込む件数

export function FollowersList({ targetUserId }: FollowersListProps) {
  const [items, setItems] = useState<UserSnippet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const { ref, inView } = useInView({ threshold: 0.1 });

  // データ読み込み関数 (getPaginatedFollowers を呼び出すように変更)
  const loadMoreItems = useCallback(
    async (cursor: string | null) => {
      if (isLoading || !hasMore) return;
      setIsLoading(true);
      console.log(
        `FollowersList: Loading more items for ${targetUserId}, cursor: ${cursor}`
      );

      try {
        // ★★★ 呼び出す関数を getPaginatedFollowers に変更 ★★★
        const result = await getPaginatedFollowers({
          targetUserId: targetUserId,
          limit: ITEMS_PER_PAGE,
          cursor: cursor ?? undefined,
        });
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        setItems((prevItems) => {
          const existingIds = new Set(prevItems.map((item) => item.id));
          const newUniqueItems = result.items.filter(
            (item) => !existingIds.has(item.id)
          );
          return [...prevItems, ...newUniqueItems];
        });
        setNextCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
      } catch (error) {
        console.error("FollowersList: Failed to load more items:", error);
      } finally {
        setIsLoading(false);
        if (!initialLoadComplete) {
          setInitialLoadComplete(true);
        }
      }
    },
    [targetUserId, isLoading, hasMore, initialLoadComplete]
  );

  // 初回ロード (変更なし)
  useEffect(() => {
    if (!initialLoadComplete) {
      loadMoreItems(null);
    }
  }, [loadMoreItems, initialLoadComplete]);

  // 無限スクロール (変更なし)
  useEffect(() => {
    if (inView && initialLoadComplete && hasMore && !isLoading) {
      loadMoreItems(nextCursor);
    }
  }, [
    inView,
    initialLoadComplete,
    hasMore,
    isLoading,
    nextCursor,
    loadMoreItems,
  ]);

  return (
    <div>
      {/* データ0件時の表示 */}
      {initialLoadComplete && items.length === 0 && !isLoading && (
        <p className='text-muted-foreground text-center py-10'>
          フォロワーはいません。
        </p>
      )}

      {/* フォロワーリスト (表示内容は FollowingList と同じ構造) */}
      <ul className='space-y-3'>
        {items.map((user) => (
          <li key={user.id}>
            <Link
              href={`/profile/${user.username}`}
              className='flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors'
            >
              <Avatar className='w-10 h-10 border'>
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? user.username ?? ""}
                />
                <AvatarFallback>
                  {user.username?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className='text-sm font-semibold'>
                  {user.name ?? user.username}
                </p>
                {user.name && user.username && (
                  <p className='text-xs text-muted-foreground'>
                    @{user.username}
                  </p>
                )}
              </div>
              {/* TODO: ここに「フォローする/フォロー解除」ボタンを設置することも可能 */}
            </Link>
          </li>
        ))}
      </ul>

      {/* ローディング表示 (変更なし) */}
      {isLoading && (
        <div className='flex justify-center items-center py-6'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      )}

      {/* トリガー要素 (変更なし) */}
      {!isLoading && hasMore && <div ref={ref} className='h-10 w-full' />}

      {/* 全件読み込み完了メッセージ (変更なし) */}
      {initialLoadComplete && !hasMore && items.length > 0 && (
        <p className='text-muted-foreground text-center py-10 text-sm'>
          すべてのユーザーを読み込みました
        </p>
      )}
    </div>
  );
}
