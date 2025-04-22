// components/component/feeds/cards/RetweetCard.tsx
"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import type { FeedItemWithRelations } from "@/lib/types";
import { RepeatIcon, TrashIcon } from "@/components/component/Icons"; // 必要なら TrashIcon も
import PostCard from "./PostCard";
import RankingUpdateCard from "./RankingUpdateCard";
import QuoteRetweetCard from "./QuoteRetweetCard"; // 引用RTのリツイートも表示する場合
import { Button } from "@/components/ui/button"; // 取り消しボタン用
import { undoRetweetAction } from "@/lib/actions/feedActions"; // 取り消しアクション
import { useToast } from "@/components/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FeedType } from "@prisma/client";
import { useSWRConfig } from "swr";
import { Loader2 } from "@/components/component/Icons"; // ローディングアイコン

interface RetweetCardProps {
  item: FeedItemWithRelations; // リツイートを表す FeedItem データ (type: RETWEET)
  loggedInUserDbId: string | null;
}

export default function RetweetCard({
  item,
  loggedInUserDbId,
}: RetweetCardProps) {
  const { mutate } = useSWRConfig();
  const { toast } = useToast();
  const [isDeleting, startDeleteTransition] = useTransition();

  const retweeter = item.user; // リツイートしたユーザー
  const originalItem = item.retweetOfFeedItem; // リツイート元の FeedItem データ
  const isOwner = loggedInUserDbId === item.userId; // このリツイートをしたのが自分か

  // リツイート取り消しハンドラ
  const handleUndoRetweet = useCallback(() => {
    // originalItem.id が必要なので、null チェックを追加
    if (!originalItem?.id || isDeleting) return;
    const originalItemId = originalItem.id; // 変数に入れておく

    startDeleteTransition(async () => {
      try {
        const result = await undoRetweetAction(originalItemId); // 元の FeedItem ID を渡す
        if (result.success) {
          toast({ title: "リツイートを取り消しました。" });
          mutate(
            (key) => Array.isArray(key) && key[0] === "timelineFeed",
            undefined,
            { revalidate: true }
          );
        } else {
          throw new Error(
            result.error || "リツイートの取り消しに失敗しました。"
          );
        }
      } catch (error) {
        toast({
          title: "取消エラー",
          description:
            error instanceof Error
              ? error.message
              : "リツイートの取り消しに失敗しました。",
          variant: "destructive",
        });
        console.error("Error undoing retweet:", error);
      }
    });
    // ★ 依存配列に originalItem.id (または originalItem), mutate を追加 ★
  }, [originalItem, isDeleting, startDeleteTransition, toast, mutate]);

  // 元のコンテンツを表示するコンポーネントを決定
  const OriginalCardComponent = () => {
    if (!originalItem) {
      return <div className='...'>リツイート元のコンテンツを表示できません...</div>;
    }
    switch (originalItem.type) {
      case FeedType.POST: // Enum を使用
        // ★ originalItem と loggedInUserDbId を渡す ★
        return (
          <PostCard
            item={originalItem as FeedItemWithRelations}
            loggedInUserDbId={loggedInUserDbId}
          />
        );
      case FeedType.RANKING_UPDATE:
        // ★ originalItem と loggedInUserDbId を渡す ★
        return (
          <RankingUpdateCard
            item={originalItem as FeedItemWithRelations}
            loggedInUserDbId={loggedInUserDbId}
          />
        );
      case FeedType.QUOTE_RETWEET:
        // ★ originalItem と loggedInUserDbId を渡す ★
        return (
          <QuoteRetweetCard
            item={originalItem as FeedItemWithRelations}
            loggedInUserDbId={loggedInUserDbId}
          />
        );
      default:
        return (
          <div className='...'>リツイート元のコンテンツを表示できません...</div>
        );
    }
  };
  return (
    <div className='border-b pt-2 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50'>
      {/* Retweet Header */}
      <div className='flex items-center justify-between px-4 pb-1'>
        <div className='flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400'>
          <RepeatIcon className='h-4 w-4' />
          <Link
            href={`/profile/${retweeter.username}`}
            className='font-semibold hover:underline'
          >
            {retweeter.name ?? retweeter.username}
          </Link>
          <span>さんがリポスト</span>
        </div>
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7'
                disabled={isDeleting}
                title='リツイートを取り消す'
              >
                {/* ★ isDeleting でローディング表示 ★ */}
                {isDeleting ? (
                  <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                ) : (
                  <TrashIcon className='h-4 w-4 text-muted-foreground hover:text-destructive' />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  リツイートを取り消しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>...</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleUndoRetweet}
                  disabled={isDeleting}
                >
                  {isDeleting ? "取消中..." : "取り消す"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {/* Original Content */}
      <OriginalCardComponent />
    </div>
  );
}
