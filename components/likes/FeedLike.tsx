// components/likes/FeedLike.tsx
// 主な責任: 投稿またはランキングリストへの「いいね」UI とロジック

"use client";

import { useTransition, useOptimistic } from "react";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "@/components/Icons";
import {
  likePostAction,
  likeRankingListAction,
} from "@/lib/actions/likeActions";
import { useToast } from "@/lib/hooks/use-toast";
import { useRouter } from "next/navigation";

interface FeedLikeProps {
  // 対象タイプ: 投稿 or ランキングリスト
  targetType: "Post" | "RankingList";
  // 対象の ID
  targetId: string;
  // 初期いいね数
  likeCount: number;
  // 初期いいね状態
  initialLiked: boolean;
}

export function FeedLike({
  targetType,
  targetId,
  likeCount,
  initialLiked,
}: FeedLikeProps) {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Optimistic UI 用フラグとカウント
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(
    initialLiked,
    (_, newState: boolean) => newState
  );
  const [optimisticLikeCount, setOptimisticLikeCount] = useOptimistic(
    likeCount,
    (state, change: number) => state + change
  );

  const handleLikeToggle = () => {
    startTransition(async () => {
      // Optimistic update
      const newState = !optimisticLiked;
      setOptimisticLiked(newState);
      setOptimisticLikeCount(newState ? 1 : -1);

      try {
        // 統一化されたアクション呼び出し
        const action =
          targetType === "Post" ? likePostAction : likeRankingListAction;
        const result = await action(targetId);

        if (!result.success) {
          // エラー時はロールバック and Toast
          toast({
            title: "エラー",
            description: result.error || "いいね失敗",
            variant: "destructive",
          });
        } else {
          // 成功時にキャッシュ再検証
          mutate(
            (key) => Array.isArray(key) && key[0] === "timelineFeed",
            undefined,
            { revalidate: true }
          );
        }
      } catch (error: any) {
        toast({
          title: "エラー",
          description: error.message || "予期せぬエラー",
          variant: "destructive",
        });
      }
    });
  };

  return (
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
        className={`h-[18px] w-[18px] ${optimisticLiked ? "fill-current" : ""}`}
      />
      <span className='text-xs'>{optimisticLikeCount}</span>
    </Button>
  );
}
