// components/component/follows/FollowingList.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer"; // 無限スクロール検知
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // UIコンポーネント
import { Loader2 } from "lucide-react"; // ローディングアイコン

// ★ サーバーアクションと関連する型をインポート (パス確認) ★
import { getPaginatedFollowing } from "@/lib/actions/followActions";
// ★ UserSnippet 型が followActions.ts で export されているか確認 ★
import type { UserSnippet } from "@/lib/actions/followActions";

interface FollowingListProps {
  targetUserId: string; // フォローリストを表示する対象ユーザーのDB ID
}

const ITEMS_PER_PAGE = 20; // 1度に読み込む件数

export function FollowingList({ targetUserId }: FollowingListProps) {
  const [items, setItems] = useState<UserSnippet[]>([]); // 表示するユーザーリスト
  const [isLoading, setIsLoading] = useState(false); // ローディング中か
  const [nextCursor, setNextCursor] = useState<string | null>(null); // 次の読み込み開始位置
  const [hasMore, setHasMore] = useState(true); // 次のデータがあるか
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // 初回読み込み完了フラグ

  // 画面内に入ったか検知するための設定
  const { ref, inView } = useInView({
    threshold: 0.1, // 要素が10%表示されたら inView が true になる
  });

  // データをさらに読み込む関数 (useCallbackでメモ化)
  const loadMoreItems = useCallback(
    async (cursor: string | null) => {
      // ローディング中、またはもう読み込むデータがない場合は中断
      if (isLoading || !hasMore) return;
      setIsLoading(true);
      console.log(`FollowingList: Loading more items, cursor: ${cursor}`);

      try {
        // サーバーアクションを呼び出して次のデータを取得
        const result = await getPaginatedFollowing({
          targetUserId: targetUserId,
          limit: ITEMS_PER_PAGE,
          cursor: cursor ?? undefined, // cursorがnullならundefinedを渡す
        });

        // 取得した新しいアイテムを既存のリストに追加
        setItems((prevItems) => {
          // 重複を避けるため、IDが既存リストにないものだけを追加
          const existingIds = new Set(prevItems.map((item) => item.id));
          const newUniqueItems = result.items.filter(
            (item) => !existingIds.has(item.id)
          );
          return [...prevItems, ...newUniqueItems];
        });
        // 次のカーソル情報を更新
        setNextCursor(result.nextCursor);
        // 次のデータがない場合は hasMore を false に
        setHasMore(result.nextCursor !== null);
      } catch (error) {
        console.error("FollowingList: Failed to load more items:", error);
        // TODO: エラー発生時のユーザー通知（例: トースト）
      } finally {
        setIsLoading(false);
        // 初回ロードが完了したことをマーク（初回ロード後のみ実行される）
        if (!initialLoadComplete) {
          setInitialLoadComplete(true);
        }
      }
    },
    [targetUserId, isLoading, hasMore, initialLoadComplete]
  ); // 依存配列を見直し

  // 初回データロード用の useEffect
  useEffect(() => {
    // まだ初回ロードが完了していなければ実行
    if (!initialLoadComplete) {
      loadMoreItems(null); // 初回はカーソルなしでロード開始
    }
  }, [loadMoreItems, initialLoadComplete]);

  // 無限スクロール用の useEffect
  useEffect(() => {
    // 監視対象(ref)が画面内に入り、初回ロードが完了し、さらにデータがあり、ロード中でない場合に実行
    if (inView && initialLoadComplete && hasMore && !isLoading) {
      loadMoreItems(nextCursor); // 現在のカーソルを使って次のデータをロード
    }
  }, [
    inView,
    initialLoadComplete,
    hasMore,
    isLoading,
    nextCursor,
    loadMoreItems,
  ]); // 依存配列に nextCursor も追加

  return (
    <div>
      {/* 初回ロード完了後、アイテムが0件の場合の表示 */}
      {initialLoadComplete && items.length === 0 && !isLoading && (
        <p className='text-muted-foreground text-center py-10'>
          フォロー中のユーザーはいません。
        </p>
      )}

      {/* フォロー中ユーザーリスト */}
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
                {/* フォールバックはユーザー名の頭文字など */}
                <AvatarFallback>
                  {user.username?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className='text-sm font-semibold'>
                  {user.name ?? user.username}
                </p>
                {/* name と username が両方ある場合のみ @username を表示する例 */}
                {user.name && user.username && (
                  <p className='text-xs text-muted-foreground'>
                    @{user.username}
                  </p>
                )}
              </div>
              {/* TODO: ここに「フォロー解除」ボタンを設置することも可能 */}
              {/* <Button variant="secondary" size="sm" className="ml-auto">フォロー中</Button> */}
            </Link>
          </li>
        ))}
      </ul>

      {/* ローディングスピナー */}
      {isLoading && (
        <div className='flex justify-center items-center py-6'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      )}

      {/* 次の読み込みをトリガーするための要素 (リストの最後、続きがある場合のみ表示) */}
      {!isLoading && hasMore && (
        // この div が画面内に入ると inView が true になる
        <div ref={ref} className='h-10 w-full'></div>
      )}

      {/* 全件読み込み完了時のメッセージ (任意) */}
      {initialLoadComplete && !hasMore && items.length > 0 && (
        <p className='text-muted-foreground text-center py-10 text-sm'>
          すべてのユーザーを読み込みました
        </p>
      )}
    </div>
  );
}
