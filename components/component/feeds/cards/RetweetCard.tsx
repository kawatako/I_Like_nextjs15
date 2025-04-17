// components/component/feeds/cards/RetweetCard.tsx
"use client";

import { useState, useTransition } from "react";
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
} from "@/components/ui/alert-dialog"; // 削除確認用

interface RetweetCardProps {
  item: FeedItemWithRelations; // リツイートを表す FeedItem データ (type: RETWEET)
  loggedInUserDbId: string | null;
}

export default function RetweetCard({
  item,
  loggedInUserDbId,
}: RetweetCardProps) {
  const { toast } = useToast();
  const [isDeleting, startDeleteTransition] = useTransition();

  // タイプガードとリツイート元データの存在チェック
  if (item.type !== "RETWEET" || !item.retweetOfFeedItem) {
    console.warn("Invalid data for RetweetCard:", item);
    return null;
  }

  const retweeter = item.user; // リツイートしたユーザー
  const originalItem = item.retweetOfFeedItem; // リツイート元の FeedItem データ
  const isOwner = loggedInUserDbId === item.userId; // このリツイートをしたのが自分か

  // リツイート取り消しハンドラ
  const handleUndoRetweet = () => {
    startDeleteTransition(async () => {
      try {
        // 元の FeedItem の ID を渡して取り消しアクションを実行
        const result = await undoRetweetAction(originalItem.id);
        if (result.success) {
          toast({ title: "リツイートを取り消しました。" });
          // TODO: タイムラインからこのカードを削除する処理 (State 更新 or 再検証)
        } else {
          throw new Error(result.error);
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
  };

  // 元のコンテンツを表示するコンポーネントを決定
  const OriginalCardComponent = () => {
    switch (originalItem.type) {
      case "POST":
        // ★ originalItem と loggedInUserDbId を PostCard に渡す ★
        // PostCard 側で initialLiked などが計算される
        return (
          <PostCard
            item={originalItem as FeedItemWithRelations}
            loggedInUserDbId={loggedInUserDbId}
          />
        );
      case "RANKING_UPDATE":
        // ★ originalItem と loggedInUserDbId を RankingUpdateCard に渡す ★
        return (
          <RankingUpdateCard
            item={originalItem as FeedItemWithRelations}
            loggedInUserDbId={loggedInUserDbId}
          />
        );
      case "QUOTE_RETWEET":
        // ★ originalItem と loggedInUserDbId を QuoteRetweetCard に渡す ★
        return (
          <QuoteRetweetCard
            item={originalItem as FeedItemWithRelations}
            loggedInUserDbId={loggedInUserDbId}
          />
        );
      // case 'RETWEET': // リツイートのリツイートは一旦表示しない
      default:
        console.warn(
          "RetweetCard: Unsupported original item type:",
          originalItem.type
        );
        return (
          <div className='p-4 text-sm text-muted-foreground italic'>
            元のコンテンツを表示できません (Type: {originalItem.type})
          </div>
        );
    }
  };

  return (
    // ★ div で囲み、背景色などを少し変えても良いかも ★
    <div className='border-b pt-2 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/50'>
      {/* Retweet Header */}
      <div className='flex items-center justify-between px-4 pb-1'>
        {" "}
        {/* 右側に削除ボタン用スペース */}
        <div className='flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400'>
          <RepeatIcon className='h-4 w-4' />
          <Link
            href={`/profile/${retweeter.username}`}
            className='font-semibold hover:underline'
          >
            {retweeter.name ?? retweeter.username}
          </Link>
          <span>さんがリポスト</span> {/* X 風に「リポスト」 */}
        </div>
        {/* ★ 自分のリツイートなら取り消しボタン表示 ★ */}
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
                <TrashIcon className='h-4 w-4 text-muted-foreground hover:text-destructive' />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  リツイートを取り消しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は元に戻せません。タイムラインからこのリツイートが削除されます。
                </AlertDialogDescription>
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

      {/* Original Content (内部の余白などは元のカードに依存) */}
      <OriginalCardComponent />
    </div>
  );
}
