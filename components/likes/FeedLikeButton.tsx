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

  console.log("🌟 FeedLikeButton mounted:", {
    targetType,
    targetId,
    initialLikedProp,
    initialLikeCount,
  });

  // ジェネリクスを明示して useOptimistic を呼び出し
  const [optimisticLiked, setOptimisticLiked] = useOptimistic<boolean, boolean>(
    initialLikedProp,
    (_prev, newVal) => newVal
  );
  const [optimisticLikeCount, setOptimisticLikeCount] = useOptimistic<
    number,
    number
  >(initialLikeCount, (count, delta) => count + delta);

  // props が変わったときのみリセット
  useEffect(() => {
    setOptimisticLiked(initialLikedProp);
    // 現在の optimisticLikeCount と初期値の差分をアクションとして渡す
    const resetDelta = initialLikeCount - optimisticLikeCount;
    setOptimisticLikeCount(resetDelta);
  }, [initialLikedProp, initialLikeCount]);

  const handleLikeToggle = () => {
    console.log("🔔 handleLikeToggle fired:", {
      optimisticLiked,
      optimisticLikeCount,
    });

    const nextLiked = !optimisticLiked;

    // ① 楽観的に更新（直接 boolean / number を渡す）
    setOptimisticLiked(nextLiked);
    setOptimisticLikeCount(nextLiked ? 1 : -1);

    // ② サーバー呼び出しとキャッシュ再検証
    startTransition(async () => {
      try {
        const result =
          targetType === "Post"
            ? await likePostAction(targetId)
            : await likeRankingListAction(targetId);

        if (!result.success) throw new Error(result.error ?? "");

        // homeFeed / profileFeed のキーだけリフェッチ
        await mutate(
          (key) =>
            Array.isArray(key) &&
            (key[0] === "homeFeed" || key[0] === "profileFeed"),
          undefined,
          { revalidate: true }
        );
      } catch (err: any) {
        // ロールバック：いいねトグル前の状態に戻す
        setOptimisticLiked(initialLikedProp);
        setOptimisticLikeCount(nextLiked ? -1 : 1);

        toast({
          title: "エラー",
          description: err.message || "いいねに失敗しました",
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
      aria-label={optimisticLiked ? "いいねを取り消す" : "いいねする"}
    >
      <HeartIcon
        className={`h-[18px] w-[18px] ${
          optimisticLiked ? "fill-current text-red-500" : ""
        }`}
      />
      <span className='text-xs'>{optimisticLikeCount}</span>
    </Button>
  );
}
