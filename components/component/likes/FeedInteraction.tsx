"use client";

import { useState, useTransition, useOptimistic } from "react"; // useOptimistic をインポート
import { Button } from "@/components/ui/button";
import {
  HeartIcon,
  MessageCircleIcon,
  RepeatIcon,
  ShareIcon,
} from "@/components/component/Icons"; // パスを確認
import {
  likePostAction,
  unlikePostAction,
  likeRankingListAction,
  unlikeRankingListAction,
} from "@/lib/actions/likeActions"; // アクションのパスを確認
import { useToast } from "@/components/hooks/use-toast";

interface FeedInteractionProps {
  targetType: "Post" | "RankingList"; // ★ いいね対象のタイプ ★
  targetId: string; // ★ 対象の ID (postId または rankingListId) ★
  likeCount: number; // 初期いいね数
  initialLiked: boolean; // 初期いいね状態
  commentCount: number; // コメント数
  // ★ 将来の拡張用 ★
  // retweetCount?: number;
  // quoteCount?: number;
}

export default function FeedInteraction({
  targetType,
  targetId,
  likeCount,
  initialLiked,
  commentCount,
}: // retweetCount = 0, // 将来用
// quoteCount = 0,  // 将来用
FeedInteractionProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // --- useOptimistic の設定 ---
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(
    initialLiked,
    (state, newState: boolean) => newState
  );
  const [optimisticLikeCount, setOptimisticLikeCount] = useOptimistic(
    likeCount,
    (state, change: number) => state + change
  );

  // --- いいねボタンのクリック処理 ---
  const handleLikeToggle = async () => {
    startTransition(async () => {
      const newOptimisticLiked = !optimisticLiked;
      const likeChange = newOptimisticLiked ? 1 : -1;

      // 1. UI を楽観的に更新
      setOptimisticLiked(newOptimisticLiked);
      setOptimisticLikeCount(likeChange);

      // 2. Server Action を呼び出し (対象タイプで分岐)
      try {
        let result;
        if (targetType === "Post") {
          const action = newOptimisticLiked ? likePostAction : unlikePostAction;
          result = await action(targetId); // postId を渡す
        } else if (targetType === "RankingList") {
          const action = newOptimisticLiked
            ? likeRankingListAction
            : unlikeRankingListAction;
          result = await action(targetId); // rankingListId を渡す
        } else {
          // 未対応のタイプ
          throw new Error("Unsupported target type for like action.");
        }

        // 3. エラーハンドリング (失敗した場合)
        if (!result?.success) {
          // useOptimistic が自動でロールバックするはずだが、エラー表示は行う
          toast({
            title: "エラー",
            description: result?.error || "いいね操作に失敗しました。",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "エラー",
          description:
            error instanceof Error
              ? error.message
              : "いいね操作中に予期せぬエラーが発生しました。",
          variant: "destructive",
        });
        console.error("Error toggling like:", error);
        // useOptimistic がロールバックしてくれるはず
      }
    });
  };

  return (
    <div className='flex items-center -ml-2'>
      {" "}
      {/* divで囲み、左マージン調整 */}
      {/* コメントボタン */}
      <Button
        variant='ghost'
        size='sm'
        className='flex items-center space-x-1 hover:text-blue-500'
      >
        <MessageCircleIcon className='h-[18px] w-[18px]' />
        <span className='text-xs'>{commentCount}</span>
      </Button>
      {/* リツイートボタン (仮) */}
      <Button
        variant='ghost'
        size='sm'
        className='flex items-center space-x-1 hover:text-green-500'
      >
        <RepeatIcon className='h-[18px] w-[18px]' />
        {/* ★ 将来的にリツイート数を表示 */}
        <span className='text-xs'>0</span>
      </Button>
      {/* いいねボタン */}
      <Button
        variant='ghost'
        size='sm'
        className={`flex items-center space-x-1 ${
          optimisticLiked
            ? "text-red-500 hover:text-red-600"
            : "hover:text-red-500"
        }`}
        onClick={handleLikeToggle}
        disabled={isPending}
      >
        <HeartIcon
          className={`h-[18px] w-[18px] ${
            optimisticLiked ? "fill-current" : ""
          }`}
        />
        <span className='text-xs'>{optimisticLikeCount}</span>
      </Button>
      {/* 共有ボタン (仮) */}
      <Button variant='ghost' size='icon' className='hover:text-blue-500'>
        <ShareIcon className='h-[18px] w-[18px]' />
      </Button>
    </div>
  );
}
