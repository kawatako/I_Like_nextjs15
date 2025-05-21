// components/likes/RankingLikeButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { startTransition, useOptimistic } from "react";
import { HeartIcon } from "@/components/Icons";
import { likeRankingListAction } from "@/lib/actions/likeActions";

interface LikeButtonProps {
  listId: string;
  likeCount: number;
  initialLiked: boolean;
  title? : string;
}

export function RankingLikeButton({
  listId,
  likeCount,
  initialLiked,
}: LikeButtonProps) {
  const router = useRouter();

  // ① いいね済みフラグの楽観的更新用
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(
    initialLiked,
    (_, newState: boolean) => newState
  );
  // ② いいね数の楽観的更新用
  const [optimisticCount, setOptimisticCount] = useOptimistic(
    likeCount,
    (count, delta: number) => count + delta
  );

  const handleClick = () => {
    const nextLiked = !optimisticLiked;

    // ————————————————————————
    // 楽観的に先行更新（同期）
    setOptimisticLiked(nextLiked);
    // 増減は +1 or -1
    setOptimisticCount(nextLiked ? 1 : -1);

    // ————————————————————————
    // サーバーアクション＆リフレッシュだけを遅延更新に
    startTransition(() => {
      likeRankingListAction(listId).then(() => {
        router.refresh();
      });
    });
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1"
      aria-label={optimisticLiked ? "いいねを取り消す" : "いいねする"}
    >
      <HeartIcon
        // liked なら赤く塗りつぶす
        className={`h-5 w-5 ${
          optimisticLiked ? "fill-current text-red-500" : ""
        }`}
      />
      <span>{optimisticCount}</span>
    </button>
  );
}
