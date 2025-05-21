// components/likes/FeedLikeButton.tsx
"use client";

import { useTransition, useOptimistic, useEffect } from "react";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "@/components/Icons";
import {
  likePostAction,
  likeRankingListAction,
} from "@/lib/actions/likeActions";
import { useToast } from "@/lib/hooks/use-toast";

interface FeedLikeProps {
  targetType: "Post" | "RankingList";
  targetId: string;
  likeCount: number;
  initialLiked: boolean;
}

export function FeedLikeButton({
  targetType,
  targetId,
  likeCount: initialLikeCount,
  initialLiked: initialLikedProp,
}: FeedLikeProps) {
  const { mutate } = useSWRConfig();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // 楽観的 UI 用の状態
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(
    initialLikedProp,
    (_, newVal: boolean) => newVal
  );
  const [optimisticLikeCount, setOptimisticLikeCount] = useOptimistic(
    initialLikeCount,
    (count, delta: number) => count + delta
  );

  // Props が変わったらリセット
  useEffect(() => {
    setOptimisticLiked(initialLikedProp);
    // reducer が「加算」なので、初期値との差分を渡してリセット
    setOptimisticLikeCount(initialLikeCount - optimisticLikeCount);
  }, [initialLikedProp, initialLikeCount, setOptimisticLiked, setOptimisticLikeCount]);

  const handleLikeToggle = () => {
    const nextLiked = !optimisticLiked;

    // ① 即時に画面を更新（同期更新）
    setOptimisticLiked(nextLiked);
    setOptimisticLikeCount(nextLiked ? 1 : -1);

    // ② サーバー呼び出しとキャッシュ再検証だけを低優先度更新に
    startTransition(async () => {
      try {
        const action =
          targetType === "Post" ? likePostAction : likeRankingListAction;
        const result = await action(targetId);

        if (!result.success) {
          // エラー時はロールバックして通知
          setOptimisticLiked(initialLikedProp);
          setOptimisticLikeCount(nextLiked ? -1 : 1);
          toast({
            title: "エラー",
            description: result.error ?? "いいねに失敗しました",
            variant: "destructive",
          });
        } else {
          // 成功時はフィードだけ再検証
          mutate("/api/timelineFeed", undefined, { revalidate: true });
        }
      } catch (err: any) {
        // 例外時もロールバック
        setOptimisticLiked(initialLikedProp);
        setOptimisticLikeCount(nextLiked ? -1 : 1);
        toast({
          title: "エラー",
          description: err.message ?? "予期せぬエラーです",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`flex items-center space-x-1 ${
        optimisticLiked
          ? "text-red-500 hover:text-red-600"
          : "hover:text-red-500"
      }`}
      onClick={handleLikeToggle}
      disabled={isPending}
      aria-label={optimisticLiked ? "いいねを取り消す" : "いいねする"}
    >
      <HeartIcon
        className={`h-[18px] w-[18px] ${
          optimisticLiked ? "fill-current text-red-500" : ""
        }`}
      />
      <span className="text-xs">{optimisticLikeCount}</span>
    </Button>
  );
}
