// components/likes/FeedLikeButton.tsx
"use client";

import React from "react";
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

  // ジェネリクスを明示
  const [optimisticLiked, setOptimisticLiked] = useOptimistic<boolean, boolean>(
    initialLikedProp,
    (_prev, newVal) => newVal
  );
  const [optimisticLikeCount, setOptimisticLikeCount] = useOptimistic<
    number,
    number
  >(
    initialLikeCount,
    (count, delta) => count + delta
  );

  // props 変化時にリセット
  useEffect(() => {
    setOptimisticLiked(initialLikedProp);
    setOptimisticLikeCount(initialLikeCount - optimisticLikeCount);
  }, [initialLikedProp, initialLikeCount]);

  // クリック時に親の Link イベントを止めてから処理
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const next = !optimisticLiked;
    console.log("🔔 FeedLikeButton clicked:", { next, targetType, targetId });

    // 楽観更新
    setOptimisticLiked(next);
    setOptimisticLikeCount(next ? 1 : -1);

    // サーバー処理
    startTransition(async () => {
      try {
        const result =
          targetType === "Post"
            ? await likePostAction(targetId)
            : await likeRankingListAction(targetId);

        console.log("🔔 likeAction result:", result);
        if (!result.success) throw new Error(result.error || "いいね失敗");

        // homeFeed/profileFeed のみ再検証
        await mutate(
          (key) =>
            Array.isArray(key) &&
            (key[0] === "homeFeed" || key[0] === "profileFeed"),
          undefined,
          { revalidate: true }
        );
      } catch (err: any) {
        console.error("🔥 like toggle error:", err);
        // rollback
        setOptimisticLiked(initialLikedProp);
        setOptimisticLikeCount(next ? -1 : 1);
        toast({
          title: "エラー",
          description: err.message,
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
        optimisticLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"
      }`}
      onClick={handleClick}
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
