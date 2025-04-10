// components/component/follows/FollowRequestsList.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getPaginatedReceivedFollowRequests } from "@/lib/actions/followActions"; // データ取得アクション
// ★ 承認・拒否アクションと関連型をインポート (パスを確認) ★
import {
  acceptFollowRequestAction,
  rejectFollowRequestAction,
  type FollowRequestWithRequester,
} from "@/lib/actions/followActions";
import { useToast } from "@/components/hooks/use-toast"; // トースト通知

interface FollowRequestsListProps {
  targetUserId: string; // リクエストを受け取っているユーザー (＝ログインユーザー) のDB ID
}

const ITEMS_PER_PAGE = 20; // 1度に読み込む件数

export function FollowRequestsList({ targetUserId }: FollowRequestsListProps) {
  const [items, setItems] = useState<FollowRequestWithRequester[]>([]);
  const [isLoading, setIsLoading] = useState(false); // リスト全体の読み込み中
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  // ★ 特定のリクエストを処理中か管理する State ★
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast(); // トースト初期化

  // 画面内検知フック
  const { ref, inView } = useInView({ threshold: 0.1 });

  // データ追加読み込み関数
  const loadMoreItems = useCallback(
    async (cursor: string | null) => {
      if (isLoading || !hasMore) return;
      setIsLoading(true);
      console.log(
        `FollowRequestsList: Loading more items for ${targetUserId}, cursor: ${cursor}`
      );
      try {
        const result = await getPaginatedReceivedFollowRequests({
          targetUserId: targetUserId,
          limit: ITEMS_PER_PAGE,
          cursor: cursor ?? undefined,
        });
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
        console.error("FollowRequestsList: Failed to load more items:", error);
        toast({
          title: "エラー",
          description: "リクエストの読み込みに失敗しました。",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        if (!initialLoadComplete) {
          setInitialLoadComplete(true);
        }
      }
    },
    [targetUserId, isLoading, hasMore, initialLoadComplete, toast]
  ); // toast も依存配列に追加

  // 初回ロード用 Effect
  useEffect(() => {
    if (!initialLoadComplete) {
      loadMoreItems(null);
    }
  }, [loadMoreItems, initialLoadComplete]);

  // 無限スクロール用 Effect
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

  // 承認ボタンハンドラー
  const handleAccept = async (requestId: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));
    try {
      const result = await acceptFollowRequestAction(requestId);
      if (result.success) {
        toast({ title: "フォローリクエストを承認しました。" });
        setItems((prev) => prev.filter((item) => item.id !== requestId)); // 成功したらリストから削除
      } else {
        toast({
          title: "エラー",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "リクエストの承認中に問題が発生しました。",
        variant: "destructive",
      });
      console.error("Accept request failed:", error);
    } finally {
      setProcessingIds((prev) => {
        // 処理完了後 ID をセットから削除
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // 拒否ボタンハンドラー
  const handleReject = async (requestId: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));
    try {
      const result = await rejectFollowRequestAction(requestId);
      if (result.success) {
        toast({ title: "フォローリクエストを拒否しました。" });
        setItems((prev) => prev.filter((item) => item.id !== requestId)); // 成功したらリストから削除
      } else {
        toast({
          title: "エラー",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "リクエストの拒否中に問題が発生しました。",
        variant: "destructive",
      });
      console.error("Reject request failed:", error);
    } finally {
      setProcessingIds((prev) => {
        // 処理完了後 ID をセットから削除
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  return (
    <div>
      {/* データ0件時の表示 */}
      {initialLoadComplete && items.length === 0 && !isLoading && (
        <p className='text-muted-foreground text-center py-10'>
          新しいフォローリクエストはありません。
        </p>
      )}

      {/* フォローリクエストリスト */}
      <ul className='space-y-3'>
        {items.map((request) => {
          const requester = request.requester; // 申請者情報
          const isProcessing = processingIds.has(request.id); // このリクエストが処理中か
          return (
            <li
              key={request.id}
              className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-md'
            >
              {/* 申請者情報 (プロフィールへのリンク) */}
              <Link
                href={`/profile/${requester.username}`}
                className='flex items-center gap-3 flex-grow hover:bg-muted rounded p-1 -m-1'
              >
                <Avatar className='w-10 h-10 border'>
                  <AvatarImage
                    src={requester.image ?? undefined}
                    alt={requester.name ?? requester.username ?? ""}
                  />
                  <AvatarFallback>
                    {requester.username?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className='text-sm font-semibold'>
                    {requester.name ?? requester.username}
                  </p>
                  {requester.name && requester.username && (
                    <p className='text-xs text-muted-foreground'>
                      @{requester.username}
                    </p>
                  )}
                </div>
              </Link>
              {/* 承認・拒否ボタン */}
              <div className='flex items-center justify-end space-x-2 flex-shrink-0 mt-2 sm:mt-0'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => handleReject(request.id)}
                  // リスト読み込み中か、このリクエスト処理中ならボタン無効
                  disabled={isLoading || isProcessing}
                >
                  {/* 処理中ならスピナー表示 */}
                  {isProcessing ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    "拒否"
                  )}
                </Button>
                <Button
                  size='sm'
                  onClick={() => handleAccept(request.id)}
                  // リスト読み込み中か、このリクエスト処理中ならボタン無効
                  disabled={isLoading || isProcessing}
                >
                  {/* 処理中ならスピナー表示 */}
                  {isProcessing ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    "承認"
                  )}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ローディングスピナー (リスト読み込み中) */}
      {isLoading && (
        <div className='flex justify-center items-center py-6'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      )}

      {/* 無限スクロール用トリガー要素 */}
      {!isLoading && hasMore && <div ref={ref} className='h-10 w-full'></div>}

      {/* 全件読み込み完了メッセージ */}
      {initialLoadComplete && !hasMore && items.length > 0 && (
        <p className='text-muted-foreground text-center py-10 text-sm'>
          すべてのリクエストを読み込みました
        </p>
      )}
    </div>
  );
}
